/* eslint-disable no-new */
import { Construct } from 'constructs'
import { App, TerraformStack, TerraformOutput } from 'cdktf'
import * as AZ from '@cdktf/provider-azurerm'
import { readFileSync } from 'fs'
import path = require('path')
import { spawnSync } from 'child_process'

class MyStack extends TerraformStack {
  constructor (scope: Construct, name: string) {
    super(scope, name)

    // define resources here
    new AZ.AzurermProvider(this, 'azureFeature', {
      features: {}
    })

    const region = 'eastus'
    const rg = new AZ.ResourceGroup(this, 'cdktf-rg', {
      name: 'cdktf-demo-rg',
      location: region
    })

    const saccount = new AZ.StorageAccount(this, 'cdktf-account', {
      name: 'cdkstorageaccount',
      location: rg.location,
      resourceGroupName: rg.name,
      accountTier: 'Standard',
      accountReplicationType: 'LRS'
    })

    const scontainer = new AZ.StorageContainer(this, 'cdktf-container', {
      storageAccountName: saccount.name,
      name: 'c-container'
    })

    spawnSync('zip',
      ['-r', 'myapp.zip', 'myapp'],
      { cwd: __dirname }
    )

    const file = new AZ.StorageBlob(this, 'blob-file', {
      name: 'myapp.zip',
      type: 'Block',
      storageAccountName: saccount.name,
      storageContainerName: scontainer.name,
      source: path.join(__dirname, 'myapp.zip')
    })

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

    const vm = new AZ.VirtualMachine(this, 'cdktf-vm', {
      name: 'cdktf-demo-vm-v6',
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
          .replace('{ACCOUNT}', saccount.name)
          .replace('{S_KEY}', saccount.primaryAccessKey)
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

    new TerraformOutput(this, 'VM', { value: vm.name })
    new TerraformOutput(this, 'url', { value: `${ip.domainNameLabel}.${region}.cloudapp.azure.com` })
    new TerraformOutput(this, 'ip', { value: ip.ipAddress })
  }
}

const app = new App()
new MyStack(app, 'hello-tf')
app.synth()
