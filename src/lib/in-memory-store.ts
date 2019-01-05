import { Store } from './store';
import { Identity } from './types';

interface StoreData {
	// Object of fields identified by the field name + potentially args.
	[identity: string]: {
		// Array of calls for a given field identity
		[fieldIdentity: string]: ReadonlyArray<number>;
	};
}

class InMemoryStore implements Store {
	private readonly store: StoreData = {};

	public setForIdentity(identity: Identity, timestamps: ReadonlyArray<number>) {
		this.ensureIdentityExists(identity);
		this.store![identity.contextIdentity]![identity.fieldIdentity] = [ ...timestamps ];
	}

	public getForIdentity(identity: Identity) {
		this.ensureIdentityExists(identity);
		return this.store[identity.contextIdentity][identity.fieldIdentity];
	}

	private ensureIdentityExists(identity: Identity) {
		if (!this.store[identity.contextIdentity]) {
			this.store[identity.contextIdentity] = {};
		}

		if (!this.store[identity.contextIdentity][identity.fieldIdentity]) {
			this.store[identity.contextIdentity][identity.fieldIdentity] = [];
		}
	}
}

export { InMemoryStore };
