const quilt = require('@quilt/quilt');
const nodeServer = require('./nodeServer3PM');
const machineFactory = require('./machines')

const deployment = quilt.createDeployment({namespace: "TEMP", adminACL: ['0.0.0.0/0']});

var machines = new machineFactory(7, "hantaowang")

var countNode = 3;
const nodeRepository = 'tsaianson/node-apt-app';
const apartmentApp = new nodeServer(countNode, nodeRepository);

apartmentApp.machPlacements(machines.getSizes());

deployment.deploy(apartmentApp);
