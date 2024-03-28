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
  totalDonated: bigint = BigInt(0); // Add a separate variable to track total donated amount

  /*
    Initialize the contract with the beneficiary, name, and description
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
    // Get who is calling the method and how much $NEAR they attached
    let donor = near.predecessorAccountId();
    let donationAmount: bigint = near.attachedDeposit() as bigint;

    let donatedSoFar = this.donations.get(donor, { defaultValue: BigInt(0) });
    let toTransfer = donationAmount;

    // This is the user's first donation, lets register it, which increases storage
    if (donatedSoFar == BigInt(0)) {
      assert(
        donationAmount >= STORAGE_COST, // Use the correct operator for comparison
        `Attach at least ${STORAGE_COST} yoctoNEAR`
      );

      // Subtract the storage cost to the amount to transfer
      toTransfer -= STORAGE_COST;
    }

    // Persist in storage the amount donated so far
    donatedSoFar += donationAmount;
    this.donations.set(donor, donatedSoFar);
    this.totalDonated += donationAmount; // Update the total donated amount

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
    -- Restrict this function to be callable only by the contract owner or an authorized account
  */
  @call({ privateFunction: true })
  change_beneficiary(beneficiary, beneficiaryName, description) {
    // Add a check to ensure only the contract owner or an authorized account can call this function
    if (near.predecessorAccountId() !== this.beneficiary) {
      throw new Error("Only the contract owner can change the beneficiary");
    }

    this.beneficiary = beneficiary;
    this.beneficiaryName = beneficiaryName;
    this.description = description;
  }

  /*
    Function to reset the donations
  */
  @call({ privateFunction: true })
  reset_donations() {
    this.donations.clear();
    this.totalDonated = BigInt(0); // Reset the total donated amount
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
    return this.totalDonated.toString(); // Use the separate variable to get the total donated amount
  }

  /*
    Function to get the top 5 donors
  */
  @view({})
  get_top_five_donors(): Donation[] {
    let topDonors: Donation[] = [];
    let minHeap = new MinHeap<Donation>((a, b) =>
      Number.parseFloat(a.total_amount) - Number.parseFloat(b.total_amount)
    );

    for (const account_id of this.donations.keys({
      start: 0,
      limit: this.donations.length,
    })) {
      const donation: Donation = this.get_donation_for_account({ account_id });
      minHeap.push(donation);

      if (minHeap.size() > 5) {
        minHeap.pop();
      }
    }

    while (!minHeap.isEmpty()) {
      topDonors.push(minHeap.pop()!);
    }

    return topDonors.reverse(); // Reverse the array to get the top 5 donors in descending order
  }
}

// MinHeap class implementation (you can use an existing library or write your own)
class MinHeap<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(value: T): void {
    this.heap.push(value);
    this.heapifyUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const root = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }

    return root;
  }

  private heapifyUp(index: number): void {
    const parentIndex = Math.floor((index - 1) / 2);

    if (
      parentIndex >= 0 &&
      this.comparator(this.heap[parentIndex], this.heap[index]) > 0
    ) {
      this.swap(index, parentIndex);
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftChildIndex = 2 * index + 1;
    const rightChildIndex = 2 * index + 2;
    let smallestIndex = index;

    if (
      leftChildIndex < this.heap.length &&
      this.comparator(this.heap[leftChildIndex], this.heap[smallestIndex]) < 0
    ) {
      smallestIndex = leftChildIndex;
    }

    if (
      rightChildIndex < this.heap.length &&
      this.comparator(this.heap[rightChildIndex], this.heap[smallestIndex]) < 0
    ) {
      smallestIndex = rightChildIndex;
    }

    if (smallestIndex !== index) {
      this.swap(index, smallestIndex);
      this.heapifyDown(smallestIndex);
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}
