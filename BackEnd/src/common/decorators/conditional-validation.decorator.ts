import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class RequiredIfConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName, relatedValue] = args.constraints;
    const relatedValueInObject = (args.object as any)[relatedPropertyName];

    // If the related property equals the expected value, this field is required
    if (relatedValueInObject === relatedValue) {
      return value !== undefined && value !== null && value !== '';
    }

    // Otherwise, it's optional
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName, relatedValue] = args.constraints;
    return `${args.property} is required when ${relatedPropertyName} is ${relatedValue}`;
  }
}

export function RequiredIf(
  relatedPropertyName: string,
  relatedValue: any,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName, relatedValue],
      validator: RequiredIfConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class RequiredIfPropertyExistsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValueInObject = (args.object as any)[relatedPropertyName];

    // If the related property exists and is truthy, this field is required
    if (relatedValueInObject) {
      return value !== undefined && value !== null && value !== '';
    }

    // Otherwise, it's optional
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} is required when ${relatedPropertyName} is present`;
  }
}

export function RequiredIfPropertyExists(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName],
      validator: RequiredIfPropertyExistsConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class MatchPropertyConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export function MatchProperty(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName],
      validator: MatchPropertyConstraint,
    });
  };
}
