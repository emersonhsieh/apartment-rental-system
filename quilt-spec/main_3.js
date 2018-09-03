const quilt = require('@quilt/quilt');
const nodeServer = require('./nodeServer3');
const machineFactory = require('./machines')

const namespace = "apartment-app-" + Math.floor(Math.random() * 10000).toString();
const deployment = quilt.createDeployment({namespace: namespace, adminACL: ['0.0.0.0/0']});

var machines = new machineFactory(2)

var countNode = 3;
const nodeRepository = 'tsaianson/node-apt-app';
const apartmentApp = new nodeServer(countNode, nodeRepository);

deployment.deploy(machines);
apartmentApp.matchPlacements(machines.getSizes());
deployment.deploy(apartmentApp);
