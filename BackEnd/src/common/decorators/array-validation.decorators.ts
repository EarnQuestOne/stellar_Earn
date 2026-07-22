import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Array length constraints
@ValidatorConstraint({ async: false })
export class ArrayMinSizeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [minSize] = args.constraints;
    return Array.isArray(value) && value.length >= minSize;
  }

  defaultMessage(args: ValidationArguments) {
    const [minSize] = args.constraints;
    return `${args.property} must have at least ${minSize} elements`;
  }
}

export function ArrayMinSize(
  min: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min],
      validator: ArrayMinSizeConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class ArrayMaxSizeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [maxSize] = args.constraints;
    return Array.isArray(value) && value.length <= maxSize;
  }

  defaultMessage(args: ValidationArguments) {
    const [maxSize] = args.constraints;
    return `${args.property} must have at most ${maxSize} elements`;
  }
}

export function ArrayMaxSize(
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [max],
      validator: ArrayMaxSizeConstraint,
    });
  };
}

// Unique array elements
@ValidatorConstraint({ async: false })
export class ArrayUniqueConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (!Array.isArray(value)) return false;

    // For primitive types, use Set
    if (value.every((item) => typeof item !== 'object')) {
      return new Set(value).size === value.length;
    }

    // For objects, check by JSON string representation
    const seen = new Set();
    for (const item of value) {
      const itemStr = JSON.stringify(item);
      if (seen.has(itemStr)) {
        return false;
      }
      seen.add(itemStr);
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must contain unique elements`;
  }
}

export function ArrayUnique(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ArrayUniqueConstraint,
    });
  };
}

// Array elements validation
@ValidatorConstraint({ async: false })
export class ArrayElementsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!Array.isArray(value)) return false;

    const [elementValidator] = args.constraints;
    return value.every((item) => elementValidator(item));
  }

  defaultMessage(args: ValidationArguments) {
    return `All elements in ${args.property} must be valid`;
  }
}

export function ArrayElements(
  elementValidator: (item: any) => boolean,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [elementValidator],
      validator: ArrayElementsConstraint,
    });
  };
}
