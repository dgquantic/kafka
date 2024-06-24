const fs = require('fs');
const path = require('path');
const { SchemaRegistry, SchemaType, readAVSCAsync } = require('@kafkajs/confluent-schema-registry');
const { Kafka } = require('kafkajs');

const ca_cert = path.join(__dirname, '../secrets/ca.crt');

const kafka = new Kafka({
  clientId: 'customer-consumer',
  brokers: ['broker-1:9191', 'broker-2:9192', 'broker-3:9193'],
  // ssl: true,
  // sasl: {
  //   mechanism: 'plain',
  //   username: 'consumer',
  //   password: 'consumer-secret'
  // }
  ssl: {
    ca: [fs.readFileSync(ca_cert, 'utf-8')],
    cert: fs.readFileSync('../secrets/consumer/consumer-signed.pem', 'utf-8'),
    key: fs.readFileSync('../secrets/consumer/consumer-key.pem', 'utf-8'),
  }
});

const registry = new SchemaRegistry({ host: 'http://schema-registry:7070' });

const topic = 'customer';
const consumer = kafka.consumer({ groupId: 'consumer-3'});

const main = async () => {
  try {
    const schema = await readAVSCAsync('./schema.avsc')
    const { id } = await registry.register({ type: SchemaType.AVRO, schema: JSON.stringify(schema) });

    await consumer.connect();
    await consumer.subscribe({ topic: topic, fromBeginning: true });
    await consumer.run({
      eachMessage: async ({topic, partition, message}) => {
        const decodedMessage = { ...message, value: await registry.decode(message.value)};
        console.log(decodedMessage.value.toString());
      }
    });
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

main();
