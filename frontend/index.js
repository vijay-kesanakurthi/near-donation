import "regenerator-runtime/runtime";
import { Contract } from "./near-interface";
import { Wallet } from "./near-wallet";

const CONTRACT = "donation-app.testnet";
// When creating the wallet you can choose to create an access key, so the user
// can skip signing non-payable methods when interacting with the contract
const wallet = new Wallet("");

// Abstract the logic of interacting with the contract to simplify your project
const contract = new Contract({
  contractId: CONTRACT,
  walletToUse: wallet,
});

// Setup on page load
window.onload = async () => {
  const isSignedIn = await wallet.startUp();

  if (isSignedIn) {
    signedInFlow();
  } else {
    signedOutFlow();
  }

  fetchBeneficiary();
  getAndShowDonations();
};

// On submit, get the greeting and send it to the contract
document.querySelector("form").onsubmit = async (event) => {
  event.preventDefault();
  // get elements from the form using their id attribute
  const { fieldset, donation } = event.target.elements;

  // disable the form while the value gets updated on-chain
  fieldset.disabled = true;
  try {
    await contract.donate(donation.value);
  } catch (e) {
    alert(
      "Something went wrong! " +
        "Maybe you need to sign out and back in? " +
        "Check your browser console for more info."
    );
    throw e;
  }

  // re-enable the form, whether the call succeeded or failed
  fieldset.disabled = false;
};

document.querySelector("#sign-in-button").onclick = () => {
  wallet.signIn();
};
document.querySelector("#sign-out-button").onclick = () => {
  wallet.signOut();
};

async function fetchBeneficiary() {
  // Get greeting from the contract
  // const currentGreeting = await contract.getBeneficiaryName();

  const total_amount = await contract.get_total_amount();
  const total_donors = await contract.number_of_donors();

  const currentGreeting = await contract.getBeneficiaryName();

  const description = await contract.get_description();

  document.getElementById("total-amount-donated").innerHTML =
    total_amount + " Ⓝ";
  document.getElementById("number_of_donors").innerHTML = total_donors;

  // Set all elements marked as greeting with the current greeting
  document.querySelectorAll("[data-behavior=beneficiary]").forEach((el) => {
    el.innerText = currentGreeting;
    el.value = currentGreeting;
  });

  document.querySelector(".donation-description").innerHTML = description;
}

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector(".signed-out-flow").style.display = "block";
}

async function signedInFlow() {
  // Displaying the signed in flow container
  document
    .querySelectorAll(".signed-in-flow")
    .forEach((elem) => (elem.style.display = "block"));

  // Check if there is a transaction hash in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const txhash = urlParams.get("transactionHashes");

  if (txhash !== null) {
    // Get result from the transaction
    let result = await contract.getDonationFromTransaction(txhash);
    document.querySelector("[data-behavior=donation-so-far]").innerText =
      result;

    // show notification
    document.querySelector("[data-behavior=notification]").style.display =
      "block";

    // remove notification again after css animation completes
    setTimeout(() => {
      document.querySelector("[data-behavior=notification]").style.display =
        "none";
    }, 11000);
  }
}

async function getAndShowDonations() {
  document.getElementById("donations-table").innerHTML = "Loading ....";

  // Load last 10 donations
  let donations = await contract.latestDonations();
  console.log(donations);

  let top_donors = await contract.topDonors();

  document.getElementById("donations-table").innerHTML = "";
  document.getElementById("top-donars-table").innerHTML = "";

  donations.forEach((elem) => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <tr>
        <th scope="row">${elem.account_id}</th>
        <td>${elem.total_amount}</td>
      </tr>
    `;
    document.getElementById("donations-table").appendChild(tr);
  });

  top_donors.forEach((elem) => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <tr>
        <th scope="row">${elem.account_id}</th>
        <td>${elem.total_amount}</td>
      </tr>
    `;
    document.getElementById("top-donars-table").appendChild(tr);
  });
}

let get_donation = (document.getElementById("get-donation-button").onclick =
  async function () {
    const a = document.getElementById("inputPassword2");
    console.log(a.value);
    let account_id = a.value;
    let donation = await contract.getDonationFromAccount(account_id);
    document.getElementById("get-donation").innerHTML = donation.concat(" Ⓝ");

    console.log(donation);
  });

window.set_donation = async function (amount) {
  let data = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd"
  ).then((response) => response.json());
  const near2usd = data["near"]["usd"];
  const amount_in_near = amount / near2usd;
  const rounded_two_decimals = Math.round(amount_in_near * 100) / 100;
  document.querySelector("#donation").value = rounded_two_decimals;
};
