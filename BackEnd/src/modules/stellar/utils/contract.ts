import { nativeToScVal, Address, xdr } from 'stellar-sdk';

export class ContractUtils {
  static encodeString(value: string): xdr.ScVal {
    return nativeToScVal(value, { type: 'string' });
  }

  static encodeAddress(value: string): xdr.ScVal {
    return new Address(value).toScVal();
  }

  static encodeU128(value: number | bigint): xdr.ScVal {
    return nativeToScVal(value, { type: 'u128' });
  }

  static encodeI128(value: number | bigint): xdr.ScVal {
    return nativeToScVal(value, { type: 'i128' });
  }

  static encodeSymbol(value: string): xdr.ScVal {
    return nativeToScVal(value, { type: 'symbol' });
  }

  static decodeValue(value: xdr.ScVal): any {
    switch (value.switch()) {
      case xdr.ScValType.scvString():
        return value.str().toString();
      case xdr.ScValType.scvSymbol():
        return value.sym().toString();
      case xdr.ScValType.scvU32():
        return value.u32();
      case xdr.ScValType.scvI32():
        return value.i32();
      default:
        // Attempt native conversion if possible, otherwise return raw
        try {
          // Provide basic conversion
          return value;
        } catch {
          return value;
        }
    }
  }
}
