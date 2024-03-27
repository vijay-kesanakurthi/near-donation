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
  beneficiary: string = "";
  donations = new UnorderedMap<bigint>("map-uid-1");
  beneficiaryName: string = "";
  description: string = "";

  /*
    Initialize the contract with the beneficiary,name and the description
    -- initialize is a private function that is called only once
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
    Function to take donations from the user
    -- payableFunction
  */
  @call({ payableFunction: true })
donate() {
    let donor = near.predecessorAccountId();
    let donationAmount: bigint = near.attachedDeposit() as bigint;

    let donatedSoFar = this.donations.get(donor, { defaultValue: BigInt(0) });
    let toTransfer = donationAmount;

    // Deduct storage cost for each donation
    if (donatedSoFar == BigInt(0)) {
        assert(
            donationAmount > STORAGE_COST,
            `Attach at least ${STORAGE_COST} yoctoNEAR for storage cost`
        );
        // Deduct storage cost from the donation amount
        toTransfer -= STORAGE_COST;
    }

    // Persist in storage the amount donated so far
    donatedSoFar += donationAmount;
    this.donations.set(donor, donatedSoFar);
    near.log(
        `Thank you ${donor} for donating ${donationAmount}! You donated a total of ${donatedSoFar}`
    );

    // Send the money to the beneficiary
    const promise = near.promiseBatchCreate(this.beneficiary);
    near.promiseBatchActionTransfer(promise, toTransfer);

    // Return the total amount donated so far
    return donatedSoFar.toString();
}


  // ============Private functions================

  /*
    Function to change the beneficiary of the contract
  */
  @call({ privateFunction: true })
change_beneficiary(
    beneficiary: string,
    beneficiaryName: string,
    description: string,
) {
    // Ensure only the contract owner can change the beneficiary
    assert(near.sender == near.contractName, "Only the contract owner can change the beneficiary");

    // Perform beneficiary information update
    this.beneficiary = beneficiary;
    this.beneficiaryName = beneficiaryName;
    this.description = description;
}


  /*
    Function to reset the donations
  */
  @call({ privateFunction: true })
reset_donations() {
    // Ensure only the contract owner can reset donations
    assert(near.sender == near.contractName, "Only the contract owner can reset donations");

    // Clear all donation records
    this.donations.clear();
}


  // ============View functions================

  @view({})
  get_beneficiary(): string {
    return this.beneficiary;
  }

  @view({})
  number_of_donors(): number {
    return this.donations.length;
  }

  @view({})
  beneficiary_name(): string {
    return this.beneficiaryName;
  }

  @view({})
  get_description(): string {
    return this.description;
  }

  /*
    Function to get recent 50 the donations
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

    // Calculate the actual start index based on the total number of donations
    const startIndex = Math.min(from_index, this.donations.length);

    // Retrieve donations starting from the calculated start index up to the specified limit
    for (const account_id of this.donations.keys({
        start: startIndex,
        limit,
    })) {
        const donation: Donation = this.get_donation_for_account({ account_id });
        ret.push(donation);
    }

    return ret;
}


  /*
    Function to get the donation for a specific account
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
    Function to get the total amount donated
  */
  @view({})
get_total_donated(): string {
    let total: BigInt = BigInt(0);
    
    // Iterate over all donations and sum up the total amount donated
    for (const donation of this.donations.values()) {
        total += donation;
    }

    return total.toString();
}


  /*
    Function to get the top 5 donors
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
}
