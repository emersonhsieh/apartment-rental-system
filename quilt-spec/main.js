const quilt = require('@quilt/quilt');
const nodeServer = require('./nodeServer');
const machineFactory = require('./machines')

const deployment = quilt.createDeployment({namespace: "TEMP", adminACL: ['0.0.0.0/0']});

var machines = new machineFactory(6, "hantaowang")

var countNode = 3;
const nodeRepository = 'tsaianson/node-apt-app';
const apartmentApp = new nodeServer(countNode, nodeRepository);

deployment.deploy(machine0.asMaster());
deployment.deploy(machine1.asWorker());
deployment.deploy(machine2.asWorker());
deployment.deploy(machine3.asWorker());
deployment.deploy(machine4.asWorker());
deployment.deploy(machine5.asWorker());
// deployment.deploy(machine6.asWorker());

// Needs to be six machines! (Temporary)
apartmentApp.machPlacements([15, 16, 17, 18, 19, 32]);

deployment.deploy(apartmentApp);
