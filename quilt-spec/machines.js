const fs = require('fs');
const quilt = require('@quilt/quilt');

function machines(num_machines) {

        this.key = [fs.readFileSync("/home/ubuntu/.ssh/id_rsa.pub", "utf8").trim()];

	this.master = new quilt.Machine({
		provider: "Amazon",
		size: "m4.large",
		region: "us-west-1",
		sshKeys: this.key,
	});		

	this.machine_list = []
	this.sizes = []
	for (size = 16; size < 16 + num_machines; size++) { 
		this.machine_list.push(new quilt.Machine({
    		provider: "Amazon",
    		size: "m4.large",
    		region: "us-west-1",
    		sshKeys: this.key,
    		diskSize: size,
	    }));
	    this.sizes.push(size);
	};

	this.deploy = function deploy(deployment) {
		deployment.deploy(this.master.asMaster());
		this.machine_list.forEach(function(entry) {
    		deployment.deploy(entry.asWorker());
	    });
    };

    this.getSizes = function getSizes() {
    	return this.sizes
    }
}

 module.exports = machines;
