# Deployment of Tracey to field devices

This document describes the process of deployment and execution of Tracey on field servers.

## Device OS

The field devices are running:

- Angstrom Linux
  - This used the **opkg** package manager

## Deployment approach

The **initial** **approach** to deployment was as follows:

- ssh to remote device
- git clone Tracey repo 
- npm install
- run application


However, a number of **issues** were encountered:

- system time on some devices was not accurate (some devices being years out of date)

  - this caused issues with SSL certificate validation

  - can be remedied by:

    ```bash
    > opkg install ntp ntpdate (time package)
    > /etc/init.d/ntpd stop
    > ntpdate pool.ntp.org
    > /etc/init.d/ntpd start
    ```

- device memory is very low, and the demands of `npm install` caused out of memory exceptions and installation could not continue.

The **revised approach** was therefore changed to:

- npm install packages on local development machine, using the required version of Node and NPM for the target device
- create a tarball of the directory, excluding all unrequired files (.git etc)
- scp the tarball to the remote device
- unzip the tarball
- run the application



## Devices 

### ProtoAir, ARMv7, Node 6

**scp tarball to remote machine**

1. Install tar on field device - the Angstrom tar package doesn’t do the job!

   ```bash
   > opkg install tar
   ```

2. Create tarball (local dev machine)

   ```bash
   > tar --exclude .git --exclude "*.log" -zcvf tracey.tgz tracey
   ```

3. Copy to remote field device

   ```bash 
   > scp -oKexAlgorithms=diffie-hellman-group1-sha1 -P 7093 tracey.tgz fst@154.117.178.30:scp_files
   > [password]
   ```

4. Unzip

   ```bash
   > cd /fst/scp_files
   > gunzip tracey.tgz
   > tar -xvf tracey.tar
   ```

5. Run

   ```bash
   > node index
   ```

   ​

