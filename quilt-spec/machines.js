const quilt = require('@quilt/quilt');


function machines(num_machines, key) {

	this.master = new quilt.Machine({
		provider: "Amazon",
		size: "m4.large",
		sshKeys: quilt.githubKeys(key),
	});		

	this.machine_list = []
	this.sizes = []
	for (size = 16; size < 16 + num_machines; size++) { 
		this.machine_list.push(new quilt.Machine({
    		provider: "Amazon",
    		size: "m4.large",
    		sshKeys: quilt.githubKeys(key),
    		diskSize: size,
		}));
		this.sizes.push(size);
	};

	this.deploy = function deploy(deployment) {
		deployment.deploy(this.master.asMaster());
		forEach(function(entry) {
    		deployment.deploy(entry.asWorker());
		});
    };

    this.getSizes = function getSizes() {
    	return this.sizes
    }
}

 module.exports = machines;
