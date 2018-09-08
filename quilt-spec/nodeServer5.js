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

    this.kibanas = []
    for (i = 0; i < 6 ; i++) { 
        this.kibanas.push(new Kibana(this.elastic, 5601 + i));
    }; 

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

    this.matchPlacements = function matchPlacements(diskSizes) {
	//3 Per Machine - Requires 7 Machines
        assert(diskSizes.length == 5);

        this.logstash.placeOn({diskSize: diskSizes[0]});
        this.proxy.placeOn({diskSize: diskSizes[0]});
        this.mysql.placeOn({diskSize: diskSizes[0]});

        this.app[0].placeOn({diskSize: diskSizes[1]});
        this.kibanas[0].placeOn({diskSize: diskSizes[1]});
        this.kibanas[1].placeOn({diskSize: diskSizes[1]});

        this.kibanas[2].placeOn({diskSize: diskSizes[2]});
        this.kibanas[3].placeOn({diskSize: diskSizes[2]});
        this.kibanas[4].placeOn({diskSize: diskSizes[2]});

        this.app[1].placeOn({diskSize: diskSizes[3]});
        this.kibanas[5].placeOn({diskSize: diskSizes[3]});

        this.postgres.placeOn({diskSize: diskSizes[4]});
        this.elastic.placeOn({diskSize: diskSizes[4]});

        this.app[2].placeOn({diskSize: diskSizes[5]});

        this.spark.placeOn([diskSizes[2], diskSizes[3], diskSizes[3]]);
    };          

    this.deploy = function deploy(deployment) {
        deployment.deploy([this.proxy, this.elastic, this.logstash, this.postgres, this.mysql]);
        deployment.deploy(this.kibanas);
        deployment.deploy(this.app);
        this.spark.deploy(deployment);
    };
}

 module.exports = nodeServer;