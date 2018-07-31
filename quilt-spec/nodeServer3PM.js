const { Container, publicInternet } = require('@quilt/quilt');
const haproxy = require('@quilt/haproxy');
const Kibana = require('./kibana.js').Kibana;
const spark = require('./sparkImgProc.js').sprk;
const elasticsearch = require('@quilt/elasticsearch');
var assert = require('assert');

function nodeServer(count, nodeRepo) {
    this.pw = 'runner';
    this.instance_number = count;

    this.elastic = new elasticsearch.Elasticsearch(1);

    this.logstash = new Container('logstash', 'hantaowang/logstash-postgres');

    this.kib = new Kibana(this.elastic, 5601);
    this.kib1 = new Kibana(this.elastic, 5602);
    this.kib2 = new Kibana(this.elastic, 5603);
    this.kib3 = new Kibana(this.elastic, 5604);
    this.kib4 = new Kibana(this.elastic, 5605);
    this.kib5 = new Kibana(this.elastic, 5606);

    this.spark = spark;

    this.postgresPort = '5432';

    this.postgres = new Container('postgres', 'library/postgres:9.4', {
        env: {
            'password': this.pw,
            'port': this.postgresPort,
        }
    });

    this.mysql = new Container('mysql', 'mysql:5.6.32', {
        env: {
            MYSQL_USER: 'user',
            MYSQL_PASSWORD: this.pw,
            MYSQL_DATABASE: 'my_db',
            MYSQL_ROOT_PASSWORD: this.pw
        }
    });

    this.mysqlHost = this.mysql.getHostname();
    this.postgresURL = 'postgresql://postgres:runner@' + this.postgres.getHostname() + ':5432/postgres';
    this.postgresHost = 'postgresql://postgres:runner@' + this.postgres.getHostname();

    this.app = new Container('aptApp', nodeRepo, {
        command: ['node', 'server.js', '--port', '80'],
    env:{
        'mySQLHost': this.mysqlHost,
        'elasticURL': this.elastic.uri(),
        'postgresURL': this.postgresURL,
        'PW': this.pw,
        'HOST': this.postgresHost,
        'PORT': this.postgresPort,
        },
    }).replicate(this.instance_number);

    this.proxy = haproxy.simpleLoadBalancer(this.app);
    this.proxy.allowFrom(publicInternet, haproxy.exposedPort);

    for (i = 0; i < this.instance_number; i++) {
        this.elastic.addClient(this.app[i]);
        this.app[i].allowFrom(this.postgres, 5432);
        this.postgres.allowFrom(this.app[i], 5432);
        this.app[i].allowFrom(this.mysql, 3306);
        this.mysql.allowFrom(this.app[i], 3306);
    }

    this.elastic.allowFromPublic();
    this.elastic.addClient(this.logstash);
    this.logstash.allowFrom(this.postgres, 5432);
    this.postgres.allowFrom(this.logstash, 5432);

    this.mysql.allowFrom(spark.masters, 3306);
    this.mysql.allowFrom(spark.workers, 3306);

    this.machPlacements = function machPlacements(diskSizes) {
	//3 Per Machine - Requires 7 Machines
    assert(diskSizes.length == 7);

    this.elastic.placeOn({diskSize: diskSizes[0]});
    this.kib.placeOn({diskSize: diskSizes[0]});

    this.postgres.placeOn({diskSize: diskSizes[1]});
    this.mysql.placeOn({diskSize: diskSizes[1]});

    this.app[0].placeOn({diskSize: diskSizes[2]});
    this.kib1.placeOn({diskSize: diskSizes[2]});

    this.app[1].placeOn({diskSize: diskSizes[3]});
    this.kib2.placeOn({diskSize: diskSizes[3]});

    this.app[2].placeOn({diskSize: diskSizes[4]});
    this.kib3.placeOn({diskSize: diskSizes[4]});

    this.proxy.placeOn({diskSize: diskSizes[5]});
    this.kib4.placeOn({diskSize: diskSizes[5]});

    this.logstash.placeOn({diskSize: diskSizes[6]});
    this.kib5.placeOn({diskSize: diskSizes[6]});

    this.spark.placeOn([diskSizes[5], diskSizes[0], diskSizes[1], diskSizes[2], diskSizes[3], diskSizes[4]]);
    };

    this.deploy = function deploy(deployment) {
        deployment.deploy([this.proxy, this.elastic, this.logstash, this.postgres, this.mysql, this.kib, this.kib1, this.kib2, this.kib3, this.kib4, this.kib5]);
        for (i = 0; i < this.instance_number; i++) {
            deployment.deploy(this.app[i]);
        }
        this.spark.deploy(deployment);
    };
}

 module.exports = nodeServer;