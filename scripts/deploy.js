const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ProofOfDelivery
  // The constructor takes the admin address as an argument
  const ProofOfDelivery = await hre.ethers.getContractFactory("ProofOfDelivery");
  const contract = await ProofOfDelivery.deploy(deployer.address);

  await contract.waitForDeployment();

  console.log("-----------------------------------------");
  console.log("ProofOfDelivery deployed to:", await contract.getAddress());
  console.log("-----------------------------------------");
  console.log("ACTION: Update your .env file with this address!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
