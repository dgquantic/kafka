const fs = require('fs');
const path = require('path');
const { SchemaRegistry, SchemaType, readAVSCAsync } = require('@kafkajs/confluent-schema-registry');
const { Kafka } = require('kafkajs');

const ca_cert = path.join(__dirname, '../secrets/ca.crt');

const kafka = new Kafka({
  clientId: 'customer-producer',
  brokers: ['broker-1:9191', 'broker-2:9192', 'broker-3:9193'],
  ssl: true,
   sasl: {
     mechanism: 'plain',
     username: 'producer',
     password: 'producer-secret'
   },
  ssl: {
    ca: [fs.readFileSync(ca_cert, 'utf-8')],
    cert: fs.readFileSync('../secrets/producer/producer-signed.pem', 'utf-8'),
    key: fs.readFileSync('../secrets/producer/producer-key.pem', 'utf-8'),
  }
});

const registry = new SchemaRegistry({ host: 'http://schema-registry:7070' });

const topic = 'customer';
const producer = kafka.producer();
let counter = 0;

const main = async () => {
  try {
    const schema = await readAVSCAsync('./schema.avsc')
    const { id } = await registry.register({ type: SchemaType.AVRO, schema: JSON.stringify(schema) });
    const payload = { count: ++counter };
    const encodedPayload = await registry.encode(id, payload);

    await producer.connect();
    await producer.send({
      topic: topic,
      messages: [ { value: encodedPayload }]
    });
    console.log('mensagem enviada');
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

setInterval(main, 5000);
