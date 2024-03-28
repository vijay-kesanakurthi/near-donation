import {
  NearBindgen,
  near,
  call,
  view,
  initialize,
  UnorderedMap,
} from "near-sdk-js";

import { assert } from "./utils";
import { Donation, STORAGE_COST } from "./model";

@NearBindgen({ requireInit: true })
class DonationContract {
  beneficiary: string = ""; // Address of the beneficiary
  donations = new UnorderedMap<bigint>("map-uid-1"); // Map to store donations
  beneficiaryName: string = ""; // Name of the beneficiary
  description: string = ""; // Description of the donation campaign

  /*
    Initialize the contract with the beneficiary, name, and description.
    This function is called only once during contract deployment.
  */
  @initialize({ privateFunction: true })
  init({
    beneficiary,
    beneficiaryName,
    description,
  }: {
    beneficiary: string;
    beneficiaryName: string;
    description: string;
  }) {
    this.beneficiary = beneficiary;
    this.beneficiaryName = beneficiaryName;
    this.description = description;
  }

  /*
    Function to take donations from the user.
    This is a payable function, meaning it can receive NEAR tokens.
  */
  @call({ payableFunction: true })
  donate() {
    // Get the caller's account ID and the attached NEAR deposit
    let donor = near.predecessorAccountId();
    let donationAmount: bigint = near.attachedDeposit() as bigint;

    // Get the total amount donated so far by the caller
    let donatedSoFar = this.donations.get(donor, { defaultValue: BigInt(0) });
    let toTransfer = donationAmount;

    // If this is the caller's first donation, register it and subtract storage cost
    if (donatedSoFar == BigInt(0)) {
      assert(
        donationAmount > STORAGE_COST,
        `Attach at least ${STORAGE_COST} yoctoNEAR`
      );

      toTransfer -= STORAGE_COST; // Subtract storage cost from the donation amount
    }

    // Persist the updated donation amount in storage
    donatedSoFar += donationAmount;
    this.donations.set(donor, donatedSoFar);
    near.log(
      `Thank you ${donor} for donating ${donationAmount}! You donated a total of ${donatedSoFar}`
    );

    // Transfer the donation amount to the beneficiary
    const promise = near.promiseBatchCreate(this.beneficiary);
    near.promiseBatchActionTransfer(promise, toTransfer);

    // Return the total amount donated by the caller
    return donatedSoFar.toString();
  }

  // ============ Private functions ================

  /*
    Function to change the beneficiary of the contract.
    Only callable by the contract owner.
  */
  @call({ privateFunction: true })
  change_beneficiary(beneficiary: string, beneficiaryName: string, description: string) {
    this.beneficiary = beneficiary;
    this.beneficiaryName = beneficiaryName;
    this.description = description;
  }

  /*
    Function to reset all donations.
    Only callable by the contract owner.
  */
  @call({ privateFunction: true })
  reset_donations() {
    this.donations.clear();
  }

  // ============ View functions ================

  /*
    Returns the current beneficiary address.
  */
  @view({})
  get_beneficiary(): string {
    return this.beneficiary;
  }

  /*
    Returns the number of unique donors.
  */
  @view({})
  number_of_donors(): number {
    return this.donations.length;
  }

  /*
    Returns the name of the beneficiary.
  */
  @view({})
  beneficiary_name(): string {
    return this.beneficiaryName;
  }

  /*
    Returns the description of the donation campaign.
  */
  @view({})
  get_description(): string {
    return this.description;
  }

  /*
    Function to get recent donations.
    Accepts optional parameters:
    - from_index: starting index for the result set (default: 0)
    - limit: maximum number of results to return (default: 50)
  */
  @view({})
  get_donations({
    from_index = 0,
    limit = 50,
  }: {
    from_index: number;
    limit: number;
  }): Donation[] {
    let ret: Donation[] = [];

    for (const account_id of this.donations.keys({
      start: from_index,
      limit,
    })) {
      const donation: Donation = this.get_donation_for_account({ account_id });
      ret.push(donation);
    }

    return ret;
  }

  /*
    Function to get the donation for a specific account.
  */
  @view({})
  get_donation_for_account({ account_id }: { account_id: string }): Donation {
    let total_amount = this.donations.get(account_id);
    return {
      account_id,
      total_amount: total_amount ? total_amount.toString() : "0",
    };
  }

  /*
    Function to get the total amount donated by all donors.
  */
  @view({})
  get_total_donated(): string {
    let total: bigint = BigInt(0);
    for (const donation of this.donations.keys({
      start: 0,
      limit: this.donations.length,
    })) {
      total += this.donations.get(donation);
    }
    return total.toString();
  }

  /*
    Function to get the top 5 donors based on their total donation amount.
  */
  @view({})
  get_top_five_donors(): Donation[] {
    let ret: Donation[] = [];

    for (const account_id of this.donations.keys({
      start: 0,
      limit: this.donations.length,
    })) {
      const donation: Donation = this.get_donation_for_account({ account_id });
      ret.push(donation);
    }
    ret.sort(
      (a, b) =>
        Number.parseFloat(b.total_amount) - Number.parseFloat(a.total_amount)
    );

    return ret.length > 5 ? ret.slice(0, 5) : ret;
  }

  // ============ Added Functionalities ================

  /*
    Function to update the donation amount for a specific account.
    Only callable by the contract owner.
  */
  @call({ privateFunction: true })
  update_donation(account_id: string, new_amount: string) {
    const amount = BigInt(new_amount);
    this.donations.set(account_id, amount);
  }

  /*
    Function to get the donation statistics.
    Returns the total number of donors, the total amount donated,
    and the average donation amount.
  */
  @view({})
  get_donation_statistics(): {
    total_donors: number;
    total_donated: string;
    average_donation: string;
  } {
    const total_donors = this.number_of_donors();
    const total_donated = this.get_total_donated();
    const average_donation =
      total_donors > 0
        ? (BigInt(total_donated) / BigInt(total_donors)).toString()
        : "0";

    return {
      total_donors,
      total_donated,
      average_donation,
    };
  }
}