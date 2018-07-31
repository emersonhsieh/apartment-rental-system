const quilt = require('@quilt/quilt');
const nodeServer = require('./nodeServer3PM');
const machineFactory = require('./machines')

const githubKey = "hantaowang"

const deployment = quilt.createDeployment({namespace: githubKey + "-apartment-app", adminACL: ['0.0.0.0/0']});

var machines = new machineFactory(7, githubKey)

var countNode = 3;
const nodeRepository = 'tsaianson/node-apt-app';
const apartmentApp = new nodeServer(countNode, nodeRepository);

deployment.deploy(machines);
apartmentApp.matchPlacements(machines.getSizes());
deployment.deploy(apartmentApp);
