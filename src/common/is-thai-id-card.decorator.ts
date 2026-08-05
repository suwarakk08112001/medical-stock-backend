import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsThaiIdCard(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isThaiIdCard',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          const digits = value.replace(/-/g, '');
          if (!/^\d{13}$/.test(digits)) return false;

          let sum = 0;
          for (let i = 0; i < 12; i++) {
            sum += parseInt(digits[i]) * (13 - i);
          }
          const checkDigit = (11 - (sum % 11)) % 10;

          return checkDigit === parseInt(digits[12]);
        },
        defaultMessage() {
          return 'idCard is not a valid Thai national ID';
        },
      },
    });
  };
}
