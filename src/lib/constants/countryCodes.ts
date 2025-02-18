export interface CountryCode {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  {
    code: 'US',
    name: 'United States',
    dial_code: '+1',
    flag: '🇺🇸',
  },
  {
    code: 'ID',
    name: 'Indonesia',
    dial_code: '+62',
    flag: '🇮🇩',
  },
  {
    code: 'SG',
    name: 'Singapore',
    dial_code: '+65',
    flag: '🇸🇬',
  },
  {
    code: 'MY',
    name: 'Malaysia',
    dial_code: '+60',
    flag: '🇲🇾',
  },
  {
    code: 'AU',
    name: 'Australia',
    dial_code: '+61',
    flag: '🇦🇺',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dial_code: '+44',
    flag: '🇬🇧',
  },
  {
    code: 'CN',
    name: 'China',
    dial_code: '+86',
    flag: '🇨🇳',
  },
  {
    code: 'JP',
    name: 'Japan',
    dial_code: '+81',
    flag: '🇯🇵',
  },
  {
    code: 'KR',
    name: 'South Korea',
    dial_code: '+82',
    flag: '🇰🇷',
  },
  {
    code: 'IN',
    name: 'India',
    dial_code: '+91',
    flag: '🇮🇳',
  },
];
