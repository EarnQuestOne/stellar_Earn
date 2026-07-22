import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsProofHashConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }

    // Validate SHA-256 hash (64 hex characters)
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    if (sha256Regex.test(value)) {
      return true;
    }

    // Validate IPFS CID (starts with Qm and is base58 encoded)
    const ipfsCidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/;
    if (ipfsCidRegex.test(value)) {
      return true;
    }

    // Validate Arweave transaction ID (43 base64url characters)
    const arweaveTxRegex = /^[a-zA-Z0-9_-]{43}$/;
    if (arweaveTxRegex.test(value)) {
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid proof hash (SHA-256, IPFS CID, or Arweave transaction ID)`;
  }
}

export function IsProofHash(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsProofHashConstraint,
    });
  };
}
