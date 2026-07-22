import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  StellarAddressType,
  WalletAddressUtils,
} from '../utils/wallet-address.utils';

/**
 * Options accepted by the @IsWalletAddress decorator.
 */
export interface IsWalletAddressOptions {
  /**
   * Address types that are permitted for this field.
   * Defaults to [PUBLIC_KEY] when not provided, which is the safest default
   * for any field that represents a payment destination or account identifier.
   */
  allowedTypes?: StellarAddressType[];
}

/**
 * Stateless class-validator constraint that delegates to WalletAddressUtils.
 * The `constraints[0]` slot carries the per-decoration options so the same
 * class instance can serve different decorator configurations without holding
 * mutable state.
 */
@ValidatorConstraint({ async: false })
export class IsWalletAddressConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const options = (args.constraints[0] ?? {}) as IsWalletAddressOptions;
    const allowedTypes = options.allowedTypes ?? [
      StellarAddressType.PUBLIC_KEY,
    ];
    return WalletAddressUtils.validate(value as string, allowedTypes).isValid;
  }

  defaultMessage(args: ValidationArguments): string {
    const options = (args.constraints[0] ?? {}) as IsWalletAddressOptions;
    const allowedTypes = options.allowedTypes ?? [
      StellarAddressType.PUBLIC_KEY,
    ];
    const typeLabel = allowedTypes.join(' or ');
    return (
      `${args.property} must be a valid Stellar ${typeLabel} address ` +
      `with a correct CRC-16 checksum`
    );
  }
}

/**
 * Validates that a DTO property contains a well-formed Stellar wallet address
 * with a correct CRC-16 checksum.
 *
 * @example
 * // Accept only standard public keys (default)
 * @IsWalletAddress()
 * stellarAddress: string;
 *
 * @example
 * // Also accept muxed accounts
 * @IsWalletAddress({ allowedTypes: [StellarAddressType.PUBLIC_KEY, StellarAddressType.MUXED_ACCOUNT] })
 * destination: string;
 */
export function IsWalletAddress(
  options?: IsWalletAddressOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [options ?? {}],
      validator: IsWalletAddressConstraint,
    });
  };
}
