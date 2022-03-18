/* eslint-disable no-new */
import { Construct } from 'constructs'
import { App, TerraformStack, TerraformOutput, AzurermBackend } from 'cdktf'
import * as AZ from '@cdktf/provider-azurerm'
import * as EX from '@cdktf/provider-external'
import { readFileSync } from 'fs'
import path = require('path')

class MyStack extends TerraformStack {
  constructor (scope: Construct, name: string) {
    super(scope, name)

    // define resources here
    new AZ.AzurermProvider(this, 'azureFeature', {
      features: {}
    })

    const config = new AZ.DataAzurermClientConfig(this, 'cdktf-application')

    new AzurermBackend(this, {
      resourceGroupName: 'TerraformBootstrap',
      key: 'azure-explorations-v2.tfstate',
      containerName: 'bootstrap',
      storageAccountName: 'jhtfbootstrap'
    })

    new EX.ExternalProvider(this, 'externals', { })

    // ********** RESOURCE GROUP **********
    const rg = new AZ.ResourceGroup(this, 'cdktf-rg-v2', {
      name: 'cdktf-rg-v2',
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

    // ********** KEY VAULT  **********
    const vault = new AZ.KeyVault(this, 'cdktf-key-vault', {
      name: 'jh-demo-vault',
      resourceGroupName: rg.name,
      location: rg.location,
      skuName: 'standard',
      tenantId: config.tenantId
    })

    new AZ.KeyVaultAccessPolicyA(this, 'cdktf-vault-azure', {
      keyVaultId: vault.id,
      tenantId: config.tenantId,
      objectId: config.objectId,
      certificatePermissions: [
        'Backup', 'Create', 'Delete', 'DeleteIssuers',
        'Get', 'GetIssuers', 'Import', 'List', 'ListIssuers',
        'ManageContacts', 'ManageIssuers', 'Purge',
        'Recover', 'Restore', 'SetIssuers', 'Update'
      ],
      keyPermissions: [
        'Backup', 'Create', 'Decrypt', 'Delete', 'Encrypt',
        'Get', 'Import', 'List', 'Purge', 'Recover', 'Restore',
        'Sign', 'UnwrapKey', 'Update', 'Verify', 'WrapKey'
      ],
      secretPermissions: [
        'Backup', 'Delete', 'Get', 'List',
        'Purge', 'Recover', 'Restore', 'Set'
      ],
      storagePermissions: [
        'Backup', 'Delete', 'DeleteSAS', 'Get',
        'GetSAS', 'List', 'ListSAS', 'Purge', 'Recover',
        'RegenerateKey', 'Restore', 'Set', 'SetSAS', 'Update'
      ]
    })

    // ********** CODE  **********
    // this.createVM(rg, storage)
    this.functionApps(rg, storage, vault)
  }

  functionApps (rg: AZ.ResourceGroup, storage: AZ.StorageAccount, vault: AZ.KeyVault) {
    // func init
    // func new
    // func azure functionapp fetch-app-settings ${app.name}`
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

    // Functions
    this.functionAppNode(rg, storage, vault, appPlan)
    this.functionAppRust(rg, storage, vault, appPlan)
  }

  functionAppNode (rg: AZ.ResourceGroup, storage: AZ.StorageAccount, vault: AZ.KeyVault, appPlan: AZ.AppServicePlan) {
    const app = new AZ.FunctionApp(this, 'cdktf-node', {
      name: 'jhtelebotv3',
      location: rg.location,
      resourceGroupName: rg.name,
      appServicePlanId: appPlan.id,
      storageAccountName: storage.name,
      storageAccountAccessKey: storage.primaryAccessKey,
      identity: { type: 'SystemAssigned' },
      appSettings: {
        FUNCTIONS_WORKER_RUNTIME: 'node',
        WEBSITE_NODE_DEFAULT_VERSION: '~14',
        CHAT_ID: `@Microsoft.KeyVault(VaultName=${vault.name};SecretName=chatId)`,
        TELEGRAM_BOT_TOKEN: `@Microsoft.KeyVault(VaultName=${vault.name};SecretName=telegramBotToken)`
      },
      osType: 'linux',
      siteConfig: {
        linuxFxVersion: 'node|14',
        use32BitWorkerProcess: false
      },
      version: '~4'
    })

    // // ********** ACCESS POLICIES **********
    // BIG ISSUE WITH TERRAFORM: https://github.com/hashicorp/terraform-provider-azurerm/issues/13320
    new AZ.KeyVaultAccessPolicyA(this, 'cdktf-vault-app', {
      keyVaultId: vault.id,
      tenantId: vault.tenantId,
      objectId: app.identity.principalId,
      keyPermissions: ['Get'],
      secretPermissions: ['Get'],
      storagePermissions: ['Get']
    })
    new TerraformOutput(this, 'NodePublish', {
      value: `func azure functionapp publish ${app.name}`
    })
    new TerraformOutput(this, 'NodeUrl', { value: app.defaultHostname })
  }

  functionAppRust (rg: AZ.ResourceGroup, storage: AZ.StorageAccount, _vault: AZ.KeyVault, appPlan: AZ.AppServicePlan) {
    // func init
    // func new
    const app = new AZ.FunctionApp(this, 'cdktf-rust', {
      name: 'jhfapprust',
      location: rg.location,
      resourceGroupName: rg.name,
      appServicePlanId: appPlan.id,
      storageAccountName: storage.name,
      storageAccountAccessKey: storage.primaryAccessKey,
      identity: { type: 'SystemAssigned' },
      appSettings: {
        FUNCTIONS_WORKER_RUNTIME: 'custom'
      },
      osType: 'linux',
      version: '~4'
    })

    new TerraformOutput(this, 'RustPublish', {
      value: `func azure functionapp publish ${app.name}`
    })
    new TerraformOutput(this, 'RustUrl', { value: app.defaultHostname })
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
      program: ['bash', '-c', 'zip -r vm.zip vm/ >> build.log && echo \'{"dest": "vm.zip"}\''],
      workingDir: __dirname
    })

    const file = new AZ.StorageBlob(this, 'blob-file', {
      name: 'vm.zip',
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
