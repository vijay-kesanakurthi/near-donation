/* Talking with a contract often involves transforming data, we recommend you to encapsulate that logic into a class */

import { utils } from "near-api-js";

export class Contract {
  constructor({ contractId, walletToUse }) {
    this.contractId = contractId;
    this.wallet = walletToUse;
  }

  async getBeneficiary() {
    return await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "get_beneficiary",
    });
  }

  async getBeneficiaryName() {
    let name = await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "beneficiary_name",
    });
    console.log(name);
    return name;
  }

  async get_description() {
    return await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "get_description",
    });
  }

  async get_total_amount() {
    return utils.format.formatNearAmount(
      await this.wallet.viewMethod({
        contractId: this.contractId,
        method: "get_total_donated",
      })
    );
  }

  async number_of_donors() {
    return await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "number_of_donors",
    });
  }

  async latestDonations() {
    const number_of_donors = await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "number_of_donors",
    });
    const min = number_of_donors > 10 ? number_of_donors - 9 : 0;

    let donations = await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "get_donations",
      args: { from_index: min, limit: number_of_donors },
    });

    donations.forEach((elem) => {
      elem.total_amount = utils.format.formatNearAmount(elem.total_amount);
    });

    return donations.reverse();
  }
  async topDonors() {
    let donations = await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "get_top_five_donors",
      args: {},
    });

    donations.forEach((elem) => {
      elem.total_amount = utils.format.formatNearAmount(elem.total_amount);
    });

    return donations;
  }

  async getDonationFromAccount(accountId) {
    let donation_amount = await this.wallet.viewMethod({
      contractId: this.contractId,
      method: "get_donation_for_account",
      args: { account_id: accountId },
    });
    console.log(donation_amount);
    return utils.format.formatNearAmount(donation_amount.total_amount);
  }

  async getDonationFromTransaction(txhash) {
    let donation_amount = await this.wallet.getTransactionResult(txhash);
    return utils.format.formatNearAmount(donation_amount);
  }

  async donate(amount) {
    let deposit = utils.format.parseNearAmount(amount.toString());
    let response = await this.wallet.callMethod({
      contractId: this.contractId,
      method: "donate",
      deposit,
    });
    return response;
  }
}
