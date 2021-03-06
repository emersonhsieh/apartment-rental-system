const { Container, allow, publicInternet , Range} = require('@quilt/quilt');
var fs = require("fs");

let image = 'quilt/spark';

/**
 * Change the Spark Docker image used to run the cluster.
 *
 * @param {string} newImage The Docker image used to run the cluster.
 */
function setImage(newImage) {
  image = newImage;
}

function getHostname(c) {
  return c.getHostname();
}

/**
 * Spark represents a Spark cluster (a set of connected Spark masters and
 * workers).
 *
 * @param {number} nMaster The number of masters to boot.
 * @param {number} nWorker The number of workers to boot.
 * @param {Container[]} [zookeeper] The Zookeeper containers used to coordinate the
 * Spark masters.
 */
function Spark(nMaster, nWorker, zookeeper) {

  config = fs.readFileSync('spark.conf', 'utf-8');

  this.masters = [];
  for (let i = 0; i < nMaster; i += 1) {
    this.masters.push(new Container('spark-ms', image, {
      command: ['run', 'master'],
      filepathToContent: {
        '/spark/conf/spark-defaults.conf': config
      }
    }));
  }

  if (zookeeper) {
    const zooHosts = zookeeper.containers.map(getHostname);
    const zooHostsStr = zooHosts.join(',');
    this.masters.forEach((master) => {
      master.setEnv('ZOO', zooHostsStr);
    });
  }

  const masterHosts = this.masters.map(getHostname);
  this.workers = [];
  for (let i = 0; i < nWorker; i += 1) {
    this.workers.push(new Container('spark-wk', image, {
      command: ['run', 'worker'],
      env: {
        MASTERS: masterHosts.join(','),
      },
      filepathToContent: {
        '/spark/conf/spark-defaults.conf': config
     }
    }));
  }

  allow(this.workers, this.workers, new Range(0, 65000));
  allow(this.workers, this.masters, new Range(0, 65000));
  allow(this.masters, this.workers, new Range(0, 65000));
  allow(this.masters, this.masters, new Range(0, 65000));

  // Flexible for workers on the same machine 
  // WARNING: does not account for other service ports!
  var count = 0;
  for (; count < nWorker; count ++) {
    allow(this.workers[count], publicInternet, 80 + count);
    allow(this.workers[count], publicInternet, 53 + count);
    allow(this.workers[count], publicInternet, 443 + count);
    allow(this.workers[count], publicInternet, 5000 + count);
    allow(publicInternet, this.workers[count], 80 + count);
    allow(publicInternet, this.workers[count], 53 + count);
    allow(publicInternet, this.workers[count], 443 + count);
    allow(publicInternet, this.workers[count], 5000 + count);
  }

  // If workers are not on the same machine
  // cont = this.workers;
  // allow(cont, publicInternet, 80);
  // allow(cont, publicInternet, 53);
  // allow(cont, publicInternet, 443);
  // allow(cont, publicInternet, 5000);
  // allow(publicInternet, cont, 80);
  // allow(publicInternet, cont, 53);
  // allow(publicInternet, cont, 443);
  // allow(publicInternet, cont, 5000);

  if (zookeeper) {
    allow(this.masters, zookeeper, 2181);
  }

  // Hard coding placements
  this.placeOn = function placeOn(diskSizes) {
    this.masters[0].placeOn({diskSize: diskSizes[0]});
    this.workers[0].placeOn({diskSize: diskSizes[1]});
    this.workers[1].placeOn({diskSize: diskSizes[2]});
  };

  this.job = function job(command) {
    this.masters.forEach((master) => {
      master.setEnv('JOB', command);
    });
    return this;
  };

  this.setEnv = function job(key, value) {
    this.masters.forEach((master) => {
      master.setEnv(key, value);
    });
    this.workers.forEach((worker) => {
      worker.setEnv(key, value);
    });
    return this;
  };

  this.exposeUIToPublic = function exposeUIToPublic() {
    allow(publicInternet, this.masters, 8080);
    allow(publicInternet, this.workers[0], 8081);
    allow(publicInternet, this.workers[1], 8082);
    return this;
  };

  this.deploy = function deploy(deployment) {
    this.masters.forEach(master => master.deploy(deployment));
    this.workers.forEach(worker => worker.deploy(deployment));
  };
}

exports.setImage = setImage;
exports.Spark = Spark;
