#!/bin/bash

set -o nounset \
    -o errexit \
    -o verbose \
    -o xtrace

# Generate CA key
openssl req -new -x509 -keyout ca.key -out ca.crt -days 36500 -subj '/CN=ca.local/OU=Local/O=Local/L=SaoPaulo/S=SP/C=BR' -passin pass:password -passout pass:password

# Kafkacat
# openssl genrsa -des3 -passout "pass:confluent" -out kafkacat.client.key 1024
# openssl req -passin "pass:confluent" -passout "pass:confluent" -key kafkacat.client.key -new -out kafkacat.client.req -subj '/CN=kafkacat.test.confluent.io/OU=TEST/O=CONFLUENT/L=PaloAlto/S=Ca/C=US'
# openssl x509 -req -CA snakeoil-ca-1.crt -CAkey snakeoil-ca-1.key -in kafkacat.client.req -out kafkacat-ca1-signed.pem -days 9999 -CAcreateserial -passin "pass:confluent"



for i in broker-1 broker-2 broker-3 zookeeper-1 zookeeper-2 zookeeper-3 control-center consumer producer
do
	echo $i
    mkdir $i
    cd $i
	# Create keystores
	keytool -genkey -noprompt \
				 -alias $i \
				 -dname "CN=$i, OU=Local, O=Local, L=SaoPaulo, S=SP, C=BR" \
				 -keystore kafka.$i.keystore.jks \
				 -keyalg RSA \
				 -storepass password \
				 -keypass password

	# Create CSR, sign the key and import back into keystore
	keytool -keystore kafka.$i.keystore.jks -alias $i -certreq -file $i.csr -storepass password -keypass password

	openssl x509 -req -CA ../ca.crt -CAkey ../ca.key -in $i.csr -out $i-signed.crt -days 9999 -CAcreateserial -passin pass:password

	keytool -keystore kafka.$i.keystore.jks -alias CARoot -import -file ../ca.crt -storepass password -keypass password

	keytool -keystore kafka.$i.keystore.jks -alias $i -import -file $i-signed.crt -storepass password -keypass password

	# Create truststore and import the CA cert.
	keytool -keystore kafka.$i.truststore.jks -alias CARoot -import -file ../ca.crt -storepass password -keypass password

  echo "password" > ${i}_sslkey_creds
  echo "password" > ${i}_keystore_creds
  echo "password" > ${i}_truststore_creds

  cd ..
done
