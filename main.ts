/* eslint-disable no-new */
import 'dotenv/config'
import { Construct } from 'constructs'
import { App, TerraformStack, TerraformOutput } from 'cdktf'
import * as AZ from '@cdktf/provider-azurerm'
import * as EX from '@cdktf/provider-external'
import { readFileSync } from 'fs'
import path = require('path')

const { TELEGRAM_BOT_TOKEN } = process.env

class MyStack extends TerraformStack {
  constructor (scope: Construct, name: string) {
    super(scope, name)

    // define resources here
    new AZ.AzurermProvider(this, 'azureFeature', {
      features: {}
    })

    new EX.ExternalProvider(this, 'externals', { })

    // ********** RESOURCE GROUP **********
    const rg = new AZ.ResourceGroup(this, 'cdktf-rg', {
      name: 'cdktf-demo-rg',
      location: 'eastus'
    })
    // ********** STORAGE  **********
    const storage = new AZ.StorageAccount(this, 'cdktf-account', {
      name: 'cdkstorageaccountv2',
      location: rg.location,
      resourceGroupName: rg.name,
      accountTier: 'Standard',
      accountReplicationType: 'LRS'
    })
    // this.createVM(rg, storage)
    this.createFunction(rg, storage)
  }

  createFunction (rg: AZ.ResourceGroup, storage: AZ.StorageAccount) {
    const appPlan = new AZ.AppServicePlan(this, 'cdktf-app-plan', {
      name: 'consumption-plan',
      location: rg.location,
      resourceGroupName: rg.name,
      sku: { tier: 'Dynamic', size: 'Y1' }, // consumption plan
      kind: 'Linux',
      reserved: true,
      lifecycle: {
        ignoreChanges: [
          'kind'
        ]
      }
    })

    const app = new AZ.FunctionApp(this, 'cdktf-function-app', {
      name: 'jhtelebotv2',
      location: rg.location,
      resourceGroupName: rg.name,
      appServicePlanId: appPlan.id,
      storageAccountName: storage.name,
      storageAccountAccessKey: storage.primaryAccessKey,
      appSettings: {
        WEBSITE_NODE_DEFAULT_VERSION: '~14',
        TELEGRAM_BOT_TOKEN: TELEGRAM_BOT_TOKEN as string
      },
      osType: 'linux',
      siteConfig: {
        linuxFxVersion: 'node|14',
        use32BitWorkerProcess: false
      },
      version: '~4'
    })

    const publish = new EX.DataExternal(this, 'publish-func', {
      dependsOn: [{ fqn: app.fqn }],
      program: ['bash', '-c', `func azure functionapp publish ${app.name} >> function.log && echo '{"ok": "true"}'`],
      workingDir: path.join(__dirname, 'CdkTfFunctions')
    })

    new TerraformOutput(this, 'Publish', { value: publish.result('ok') })
    new TerraformOutput(this, 'Function App', { value: app.defaultHostname })
  }

  createVM (rg: AZ.ResourceGroup, storage: AZ.StorageAccount) {
    // ********** NETWORK **********
    const vnet = new AZ.VirtualNetwork(this, 'cdktf-vnet', {
      name: 'd-vnet',
      resourceGroupName: rg.name,
      location: rg.location,
      addressSpace: ['10.0.0.0/16']
      // subnet:
    })

    const subnet = new AZ.Subnet(this, 'cdktf-subnet', {
      name: 'd-subnet',
      resourceGroupName: rg.name,
      virtualNetworkName: vnet.name,
      addressPrefixes: ['10.0.2.0/24']
    })

    const ip = new AZ.PublicIp(this, 'cdktf-ip', {
      name: 'public-ip',
      resourceGroupName: rg.name,
      location: rg.location,
      allocationMethod: 'Dynamic',
      domainNameLabel: 'chi-test'
    })

    const ni = new AZ.NetworkInterface(this, 'cdktf-ni', {
      name: 'd-ni',
      resourceGroupName: rg.name,
      location: rg.location,
      ipConfiguration: [{
        name: 'internal',
        subnetId: subnet.id,
        privateIpAddressAllocation: 'Dynamic',
        publicIpAddressId: ip.id
      }]
    })

    const nsc = new AZ.NetworkSecurityGroup(this, 'cdktf-nsg', {
      name: 'demo-nsg',
      location: rg.location,
      resourceGroupName: rg.name,
      securityRule: [
        {
          name: 'SSH',
          priority: 1001,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourcePortRange: '*',
          destinationPortRange: '22',
          sourceAddressPrefix: '*',
          destinationAddressPrefix: '*'
        },
        {
          name: 'HTTP',
          priority: 1002,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourcePortRange: '*',
          destinationPortRange: '80',
          sourceAddressPrefix: '*',
          destinationAddressPrefix: '*'
        }
      ]
    })

    new AZ.NetworkInterfaceSecurityGroupAssociation(this, 'cdktf-nsgassociation', {
      networkInterfaceId: ni.id,
      networkSecurityGroupId: nsc.id
    })

    // ********** BLOB STORAGE **********
    const scontainer = new AZ.StorageContainer(this, 'cdktf-container', {
      storageAccountName: storage.name,
      name: 'c-container-v2'
    })

    const build = new EX.DataExternal(this, 'zip-vm', {
      program: ['bash', '-c', 'zip -r myapp.zip myapp/ >> build.log && echo \'{"dest": "myapp.zip"}\''],
      workingDir: __dirname
    })

    const file = new AZ.StorageBlob(this, 'blob-file', {
      name: 'myapp.zip',
      type: 'Block',
      storageAccountName: storage.name,
      storageContainerName: scontainer.name,
      source: path.join(__dirname, build.result('dest').toString())
    })

    // ********** VM **********
    const vm = new AZ.VirtualMachine(this, 'cdktf-vm', {
      name: 'cdktf-demo-vm-v7',
      resourceGroupName: rg.name,
      location: rg.location,
      vmSize: 'Standard_DS1_v2',
      storageOsDisk: {
        name: 'disk',
        createOption: 'FromImage'
      },
      deleteOsDiskOnTermination: true,
      networkInterfaceIds: [ni.id],
      osProfile: {
        computerName: 'cdktfMachinev6',
        adminUsername: 'azureuser',
        adminPassword: 'jhonRocha123@',
        customData: readFileSync('./cloud-init/customData.yml', 'utf8')
          .replace('{CONTAINER}', scontainer.name)
          .replace('{BLOBNAME}', file.name)
          .replace('{ACCOUNT}', storage.name)
          .replace('{S_KEY}', storage.primaryAccessKey)
      },
      osProfileLinuxConfig: {
        disablePasswordAuthentication: false
      },
      storageImageReference: {
        publisher: 'Canonical',
        sku: '18.04-LTS',
        offer: 'UbuntuServer',
        version: 'latest'
      }
    })

    // ********** OUTPUTS **********
    new TerraformOutput(this, 'VM', { value: vm.name })
    new TerraformOutput(this, 'url', { value: `http://${ip.domainNameLabel}.${rg.location}.cloudapp.azure.com` })
    new TerraformOutput(this, 'ip', { value: ip.ipAddress })
  }
}

const app = new App()
new MyStack(app, 'hello-tf')
app.synth()
