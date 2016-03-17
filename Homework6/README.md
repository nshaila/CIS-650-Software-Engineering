# Homework6 
Dealing with Malicious Node 

This Project implements a combination of Certificate Authority and Ricart and Agrawala Algorithm for accessing critical section. The design contains 2 secured networks one created by CA and other created by Critical Section. A worker can only join the CS network after getting the key from CA>
The project has 4 main files :

CertificateAuthority.js : 
-This creates a network using node discover module 
-Waits for workers to join the network and get a authorises key.
- It already has the public keys and mac address for all the valid workers.
- A new worker will send the request to the CA using the public key of CA , CA will process this request and send back the symmetric key to join the network to access the critical section.
- This key is encrypted using the public key of the worker so only the legitimate worker can access the CS.

critical_section.js :
It creates a secured network so that workers can join . The key to join the network can only be given by CA.	

Worker.js:
As soon as the worker starts it first registers itself with CA and gets the key for joining the CS network.
Once joined the CS network , the workers run mutual exclusion algorithm to access the critical section.
All the messages in the CS network are encrypted using the AES256 and hashing.

malicious.js :
We assume that the malicious node knows the mac address of the legitimate workers.
So it tries to use the mac address and send request to CA , to get the key.
The malicious will get the reply from CA but it cannot decrypt the messsage as it does not have the legitimate private key to decrypt.


Future work:
Add the signature with encryption of the message which will make the network more secure.



