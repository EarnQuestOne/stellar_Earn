import { Keypair, StrKey } from 'stellar-sdk';
import { validate } from 'class-validator';
import {
  AddressValidationResult,
  StellarAddressType,
  StellarNetwork,
  WalletAddressUtils,
} from '#src/common/utils/wallet-address.utils';
import {
  IsWalletAddress,
  IsWalletAddressConstraint,
} from '#src/common/decorators/is-wallet-address.decorator';

// ---------------------------------------------------------------------------
// Shared test fixtures â€” generated once per suite to keep tests fast.
// ---------------------------------------------------------------------------
const keypair = Keypair.random();
const VALID_PUBLIC_KEY = keypair.publicKey();
const VALID_SECRET_KEY = keypair.secret();

/**
 * Build a valid muxed (M-prefixed) address from an Ed25519 public key.
 * Layout: 8-byte big-endian user ID | 32-byte raw key bytes.
 */
function buildMuxedAddress(publicKey: string, userId = BigInt(1)): string {
  const rawKey = StrKey.decodeEd25519PublicKey(publicKey);
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64BE(userId);
  return StrKey.encodeMed25519PublicKey(Buffer.concat([idBuf, rawKey]));
}

const VALID_MUXED_ADDRESS = buildMuxedAddress(VALID_PUBLIC_KEY);

/** Corrupt the final character of an address to invalidate its checksum. */
function corruptChecksum(address: string): string {
  const last = address.charAt(address.length - 1);
  const replacement = last === 'A' ? 'B' : 'A';
  return address.slice(0, -1) + replacement;
}

// ---------------------------------------------------------------------------
// WalletAddressUtils.detectAddressType
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.detectAddressType', () => {
  it('identifies a G-prefixed address as PUBLIC_KEY', () => {
    expect(WalletAddressUtils.detectAddressType(VALID_PUBLIC_KEY)).toBe(
      StellarAddressType.PUBLIC_KEY,
    );
  });

  it('identifies an M-prefixed address as MUXED_ACCOUNT', () => {
    expect(WalletAddressUtils.detectAddressType(VALID_MUXED_ADDRESS)).toBe(
      StellarAddressType.MUXED_ACCOUNT,
    );
  });

  it('identifies an S-prefixed address as SECRET_KEY', () => {
    expect(WalletAddressUtils.detectAddressType(VALID_SECRET_KEY)).toBe(
      StellarAddressType.SECRET_KEY,
    );
  });

  it('returns UNKNOWN for an unrecognized prefix', () => {
    expect(WalletAddressUtils.detectAddressType('XABCDEF123')).toBe(
      StellarAddressType.UNKNOWN,
    );
  });

  it('returns UNKNOWN for an empty string', () => {
    expect(WalletAddressUtils.detectAddressType('')).toBe(
      StellarAddressType.UNKNOWN,
    );
  });

  it('returns UNKNOWN for a non-string value', () => {
    expect(
      WalletAddressUtils.detectAddressType(null as unknown as string),
    ).toBe(StellarAddressType.UNKNOWN);
  });
});

// ---------------------------------------------------------------------------
// WalletAddressUtils.validateChecksum
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.validateChecksum', () => {
  it('returns true for a valid Ed25519 public key', () => {
    expect(WalletAddressUtils.validateChecksum(VALID_PUBLIC_KEY)).toBe(true);
  });

  it('returns true for a valid Ed25519 secret key', () => {
    expect(WalletAddressUtils.validateChecksum(VALID_SECRET_KEY)).toBe(true);
  });

  it('returns true for a valid muxed account address', () => {
    expect(WalletAddressUtils.validateChecksum(VALID_MUXED_ADDRESS)).toBe(true);
  });

  it('returns false when the checksum byte is corrupted', () => {
    expect(
      WalletAddressUtils.validateChecksum(corruptChecksum(VALID_PUBLIC_KEY)),
    ).toBe(false);
  });

  it('returns false for a truncated address', () => {
    expect(
      WalletAddressUtils.validateChecksum(VALID_PUBLIC_KEY.slice(0, 40)),
    ).toBe(false);
  });

  it('returns false for an address with a wrong prefix', () => {
    const wrongPrefix = 'X' + VALID_PUBLIC_KEY.slice(1);
    expect(WalletAddressUtils.validateChecksum(wrongPrefix)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(WalletAddressUtils.validateChecksum('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(WalletAddressUtils.validateChecksum(null as unknown as string)).toBe(
      false,
    );
  });

  it('returns false for a numeric value', () => {
    expect(
      WalletAddressUtils.validateChecksum(12345 as unknown as string),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WalletAddressUtils.validate
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.validate', () => {
  describe('valid inputs', () => {
    it('returns isValid=true for a correct public key with no type filter', () => {
      const result = WalletAddressUtils.validate(VALID_PUBLIC_KEY);
      expect(result.isValid).toBe(true);
      expect(result.addressType).toBe(StellarAddressType.PUBLIC_KEY);
      expect(result.errors).toHaveLength(0);
    });

    it('returns isValid=true for a muxed address when MUXED_ACCOUNT is allowed', () => {
      const result = WalletAddressUtils.validate(VALID_MUXED_ADDRESS, [
        StellarAddressType.MUXED_ACCOUNT,
      ]);
      expect(result.isValid).toBe(true);
      expect(result.addressType).toBe(StellarAddressType.MUXED_ACCOUNT);
    });

    it('trims leading and trailing whitespace before validating', () => {
      const result = WalletAddressUtils.validate(`  ${VALID_PUBLIC_KEY}  `);
      expect(result.isValid).toBe(true);
    });

    it('accepts a secret key when SECRET_KEY is explicitly allowed', () => {
      const result = WalletAddressUtils.validate(VALID_SECRET_KEY, [
        StellarAddressType.SECRET_KEY,
      ]);
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects an empty string', () => {
      const result = WalletAddressUtils.validate('');
      assertInvalid(result, 'non-empty string');
    });

    it('rejects a whitespace-only string', () => {
      const result = WalletAddressUtils.validate('   ');
      assertInvalid(result, 'non-empty string');
    });

    it('rejects an unrecognized prefix', () => {
      const result = WalletAddressUtils.validate('XABCDEF123456');
      assertInvalid(result, 'Unrecognized address prefix');
    });

    it('rejects an address with a corrupted checksum', () => {
      const result = WalletAddressUtils.validate(
        corruptChecksum(VALID_PUBLIC_KEY),
      );
      assertInvalid(result, 'checksum');
    });

    it('rejects a secret key when only PUBLIC_KEY is allowed', () => {
      const result = WalletAddressUtils.validate(VALID_SECRET_KEY, [
        StellarAddressType.PUBLIC_KEY,
      ]);
      assertInvalid(result, 'not permitted');
    });

    it('rejects a muxed address when only PUBLIC_KEY is allowed', () => {
      const result = WalletAddressUtils.validate(VALID_MUXED_ADDRESS, [
        StellarAddressType.PUBLIC_KEY,
      ]);
      assertInvalid(result, 'not permitted');
    });

    it('includes a single actionable error message per failure', () => {
      const result = WalletAddressUtils.validate('invalid');
      expect(result.errors).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// WalletAddressUtils.validateRecipient
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.validateRecipient', () => {
  it('accepts a standard public key', () => {
    expect(WalletAddressUtils.validateRecipient(VALID_PUBLIC_KEY).isValid).toBe(
      true,
    );
  });

  it('accepts a muxed account address', () => {
    expect(
      WalletAddressUtils.validateRecipient(VALID_MUXED_ADDRESS).isValid,
    ).toBe(true);
  });

  it('rejects a secret key', () => {
    const result = WalletAddressUtils.validateRecipient(VALID_SECRET_KEY);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('not permitted');
  });

  it('rejects an invalid address', () => {
    expect(WalletAddressUtils.validateRecipient('not-an-address').isValid).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// WalletAddressUtils.validateForNetwork
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.validateForNetwork', () => {
  const networks: StellarNetwork[] = [
    StellarNetwork.TESTNET,
    StellarNetwork.MAINNET,
  ];

  networks.forEach((network) => {
    describe(`network: ${network}`, () => {
      it('accepts a valid public key', () => {
        expect(
          WalletAddressUtils.validateForNetwork(VALID_PUBLIC_KEY, network)
            .isValid,
        ).toBe(true);
      });

      it('accepts a valid muxed account', () => {
        expect(
          WalletAddressUtils.validateForNetwork(VALID_MUXED_ADDRESS, network)
            .isValid,
        ).toBe(true);
      });

      it('rejects a secret key', () => {
        expect(
          WalletAddressUtils.validateForNetwork(VALID_SECRET_KEY, network)
            .isValid,
        ).toBe(false);
      });

      it('rejects a malformed address', () => {
        expect(
          WalletAddressUtils.validateForNetwork('bad-address', network).isValid,
        ).toBe(false);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// WalletAddressUtils.normalize
// ---------------------------------------------------------------------------
describe('WalletAddressUtils.normalize', () => {
  it('returns the address unchanged when already trimmed', () => {
    expect(WalletAddressUtils.normalize(VALID_PUBLIC_KEY)).toBe(
      VALID_PUBLIC_KEY,
    );
  });

  it('strips surrounding whitespace from a valid address', () => {
    expect(WalletAddressUtils.normalize(`  ${VALID_PUBLIC_KEY}  `)).toBe(
      VALID_PUBLIC_KEY,
    );
  });

  it('normalizes a valid muxed address', () => {
    expect(WalletAddressUtils.normalize(VALID_MUXED_ADDRESS)).toBe(
      VALID_MUXED_ADDRESS,
    );
  });

  it('returns null for an address with an invalid checksum', () => {
    expect(
      WalletAddressUtils.normalize(corruptChecksum(VALID_PUBLIC_KEY)),
    ).toBeNull();
  });

  it('returns null for a completely invalid string', () => {
    expect(WalletAddressUtils.normalize('not-valid')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(WalletAddressUtils.normalize(null as unknown as string)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IsWalletAddress decorator (via class-validator's validate())
// ---------------------------------------------------------------------------
describe('IsWalletAddress decorator', () => {
  class DefaultDto {
    @IsWalletAddress()
    address: string;
  }

  class RecipientDto {
    @IsWalletAddress({
      allowedTypes: [
        StellarAddressType.PUBLIC_KEY,
        StellarAddressType.MUXED_ACCOUNT,
      ],
    })
    destination: string;
  }

  it('passes for a valid public key (default options)', async () => {
    const dto = Object.assign(new DefaultDto(), { address: VALID_PUBLIC_KEY });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails for an invalid address (default options)', async () => {
    const dto = Object.assign(new DefaultDto(), {
      address: 'GAAAAAAAAINVALID',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('address');
  });

  it('fails for a secret key when only PUBLIC_KEY is allowed', async () => {
    const dto = Object.assign(new DefaultDto(), { address: VALID_SECRET_KEY });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('passes for a muxed address when MUXED_ACCOUNT is explicitly allowed', async () => {
    const dto = Object.assign(new RecipientDto(), {
      destination: VALID_MUXED_ADDRESS,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails for a secret key used as a payment destination', async () => {
    const dto = Object.assign(new RecipientDto(), {
      destination: VALID_SECRET_KEY,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('produces a descriptive default error message', () => {
    const constraint = new IsWalletAddressConstraint();
    const mockArgs = {
      property: 'stellarAddress',
      constraints: [{}],
    } as unknown as import('class-validator').ValidationArguments;
    const message = constraint.defaultMessage(mockArgs);
    expect(message).toContain('stellarAddress');
    expect(message).toContain('PUBLIC_KEY');
    expect(message).toContain('checksum');
  });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function assertInvalid(
  result: AddressValidationResult,
  expectedFragment: string,
): void {
  expect(result.isValid).toBe(false);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].toLowerCase()).toContain(
    expectedFragment.toLowerCase(),
  );
}
