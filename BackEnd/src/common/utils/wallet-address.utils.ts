import { StrKey } from 'stellar-sdk';

/**
 * Supported Stellar network environments.
 * Stellar addresses are format-agnostic across networks; the network context
 * determines which Horizon/Soroban endpoint is used for submissions.
 */
export enum StellarNetwork {
  TESTNET = 'TESTNET',
  MAINNET = 'MAINNET',
}

/**
 * Stellar StrKey address types identified by their version-byte prefix.
 * Reference: https://developers.stellar.org/docs/learn/encyclopedia/network-configuration/stellar-base/strkey
 */
export enum StellarAddressType {
  /** G-prefix: standard Ed25519 public key (account address) */
  PUBLIC_KEY = 'PUBLIC_KEY',
  /** M-prefix: multiplexed (muxed) account embedding a numeric user ID */
  MUXED_ACCOUNT = 'MUXED_ACCOUNT',
  /** S-prefix: Ed25519 secret seed — never transmit over the wire */
  SECRET_KEY = 'SECRET_KEY',
  /** PA-prefix: pre-authorized signed payload */
  SIGNED_PAYLOAD = 'SIGNED_PAYLOAD',
  /** Unrecognized or malformed prefix */
  UNKNOWN = 'UNKNOWN',
}

/** Immutable result returned by all validation methods. */
export interface AddressValidationResult {
  readonly isValid: boolean;
  readonly addressType: StellarAddressType;
  /** Non-empty only when isValid === false. */
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Internal constants — defined once at module level to avoid repeated
// allocation on every call. O(1) space overhead.
// ---------------------------------------------------------------------------
const ALLOWED_RECIPIENT_TYPES: readonly StellarAddressType[] = [
  StellarAddressType.PUBLIC_KEY,
  StellarAddressType.MUXED_ACCOUNT,
];

const VALID_RESULT_BASE = {
  isValid: true,
  errors: [] as readonly string[],
} as const;

/** Build a reusable invalid result tuple. */
function invalidResult(
  addressType: StellarAddressType,
  message: string,
): AddressValidationResult {
  return { isValid: false, addressType, errors: [message] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stateless utilities for Stellar wallet address checksum verification,
 * address-type detection, network-context validation, and normalization.
 *
 * All methods are pure functions with no side effects.
 *
 * Complexity notes are given per method.
 */
export class WalletAddressUtils {
  /**
   * Detect the Stellar address type from its version-byte prefix.
   *
   * Checks the two-character 'PA' prefix before the single-character prefixes
   * so signed-payload addresses are never misidentified.
   *
   * Time: O(1) | Space: O(1)
   */
  static detectAddressType(address: string): StellarAddressType {
    if (typeof address !== 'string' || address.length === 0) {
      return StellarAddressType.UNKNOWN;
    }

    // Two-character prefix must be evaluated before single-character prefixes.
    if (address.startsWith('PA')) return StellarAddressType.SIGNED_PAYLOAD;
    if (address.startsWith('G')) return StellarAddressType.PUBLIC_KEY;
    if (address.startsWith('M')) return StellarAddressType.MUXED_ACCOUNT;
    if (address.startsWith('S')) return StellarAddressType.SECRET_KEY;

    return StellarAddressType.UNKNOWN;
  }

  /**
   * Verify the CRC-16 checksum embedded in a Stellar StrKey address by
   * delegating to the official stellar-sdk validators.
   *
   * Unlike a plain regex check, this detects single-bit corruption anywhere
   * in the encoded payload.
   *
   * Time: O(n) where n is address length | Space: O(1)
   */
  static validateChecksum(address: string): boolean {
    if (typeof address !== 'string') return false;

    try {
      switch (WalletAddressUtils.detectAddressType(address)) {
        case StellarAddressType.PUBLIC_KEY:
          return StrKey.isValidEd25519PublicKey(address);
        case StellarAddressType.MUXED_ACCOUNT:
          return StrKey.isValidMed25519PublicKey(address);
        case StellarAddressType.SECRET_KEY:
          return StrKey.isValidEd25519SecretSeed(address);
        case StellarAddressType.SIGNED_PAYLOAD:
          return StrKey.isValidSignedPayload(address);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Fully validate a Stellar address: non-empty guard → prefix detection →
   * CRC-16 checksum verification → optional address-type allow-list.
   *
   * The first failing check short-circuits and returns a single, actionable
   * error message.
   *
   * @param address     The raw address string (whitespace is trimmed first).
   * @param allowedTypes Optional allow-list of accepted types.
   *                     Defaults to all structurally valid types when omitted.
   *
   * Time: O(n) | Space: O(1)
   */
  static validate(
    address: string,
    allowedTypes?: readonly StellarAddressType[],
  ): AddressValidationResult {
    if (typeof address !== 'string' || address.trim().length === 0) {
      return invalidResult(
        StellarAddressType.UNKNOWN,
        'Address must be a non-empty string',
      );
    }

    const normalized = address.trim();
    const addressType = WalletAddressUtils.detectAddressType(normalized);

    if (addressType === StellarAddressType.UNKNOWN) {
      return invalidResult(
        StellarAddressType.UNKNOWN,
        'Unrecognized address prefix; expected G (public key), M (muxed account), ' +
          'S (secret key), or PA (signed payload)',
      );
    }

    if (!WalletAddressUtils.validateChecksum(normalized)) {
      return invalidResult(addressType, 'Address checksum is invalid');
    }

    if (
      allowedTypes !== undefined &&
      allowedTypes.length > 0 &&
      !allowedTypes.includes(addressType)
    ) {
      return invalidResult(
        addressType,
        `Address type '${addressType}' is not permitted; ` +
          `allowed: ${allowedTypes.join(', ')}`,
      );
    }

    return { ...VALID_RESULT_BASE, addressType };
  }

  /**
   * Validate an address intended as a payment or transfer recipient.
   * Accepts only PUBLIC_KEY and MUXED_ACCOUNT — rejects secret keys and
   * signed payloads, which are never valid on-chain destinations.
   *
   * Time: O(n) | Space: O(1)
   */
  static validateRecipient(address: string): AddressValidationResult {
    return WalletAddressUtils.validate(address, ALLOWED_RECIPIENT_TYPES);
  }

  /**
   * Validate an address for use in a specific Stellar network environment.
   *
   * Stellar StrKey addresses are structurally identical on TESTNET and MAINNET;
   * the network is distinguished by the transaction's network passphrase, not
   * the address format.  This method therefore validates structural correctness
   * and enforces that only recipient-safe types (public key or muxed account)
   * are accepted.  Secret keys and signed payloads are always rejected.
   *
   * @param address The wallet address to validate.
   * @param network The target network environment.
   *
   * Time: O(n) | Space: O(1)
   */
  static validateForNetwork(
    address: string,
    network: StellarNetwork,
  ): AddressValidationResult {
    // Network parameter is intentionally part of the signature so callers
    // make their network context explicit, enabling future network-specific
    // rules (e.g., allow-listed or deny-listed addresses per environment).
    void network;

    return WalletAddressUtils.validate(address, ALLOWED_RECIPIENT_TYPES);
  }

  /**
   * Trim whitespace and return the address if it passes checksum validation,
   * or null otherwise.  Useful for sanitizing user-supplied input before
   * persisting or comparing addresses.
   *
   * Time: O(n) | Space: O(n)
   */
  static normalize(address: string): string | null {
    if (typeof address !== 'string') return null;
    const trimmed = address.trim();
    return WalletAddressUtils.validateChecksum(trimmed) ? trimmed : null;
  }
}
