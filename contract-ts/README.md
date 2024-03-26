# Donation Contract

# Quickstart

1. Make sure you have installed [node.js](https://nodejs.org/en/download/package-manager/) >= 16.
2. Install the [`NEAR CLI`](https://github.com/near/near-cli#setup)

<br />

## 1. Build and Deploy the Contract

You can automatically compile and deploy the contract in the NEAR testnet by running:

```bash
# (optional) If you don't have an account, create one
near create-account <account-id> --useFaucet
or
# login to exciting web account
near login

#Build the contract
npm run build

# Deploy the contract
near deploy <account-id> build/donation.wasm
```

The contract will be automatically initialized with a default `beneficiary` to dacadeorg.testnet.

## 1. Initializing contract

```bash
# Use near-cli to initialize contract to custom baneficiary
near call <dev-account> init '{"beneficiary":"<account>","beneficiaryName": "<name>","description": "<about>",}' --accountId <dev-account>
```

<br />

## 2. Get Beneficiary

`beneficiary` is a read-only method (`view` method) that returns the beneficiary of the donations.

`View` methods can be called for **free** by anyone, even people **without a NEAR account**!

```bash
near view <dev-account> beneficiary
```

<br />

## 3. Donate

`donate` forwards any attached money to the `beneficiary` while keeping track of it.

`donate` is a payable method for which can only be invoked using a NEAR account. The account needs to attach money and pay GAS for the transaction.

```bash
# Use near-cli to donate 1 NEAR
near call <dev-account> donate --amount 1 --accountId <account>

```

## 4. Change Beneficiary

`change_beneficiary` method used to change beneficairy ,name and description.

```bash

near call <dev-account> change_beneficiary '{"beneficiary":"<account>","beneficiaryName": "<name>","description": "<about>",}' --accountId <dev-account>

```

## 5. Reset

`reset` method used to reset the dontions. This can be used after the `change_beneficiary` method create entirely new donation.

```bash
near call <dev-account> reset

```
