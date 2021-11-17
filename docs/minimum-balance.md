## Minimum Balance

General calculation for minimum Balance

`BASE_ALGO + ASSET_MINIMUM + APPS_MINIMUM`

### BASE_ALGO
Every account on Algorand must have a minimum balance of **100,000** microAlgos.
[reference](https://developer.algorand.org/docs/features/accounts/)

## ASSET_MINIMUM
For every asset an account creates or owns, its minimum balance is increased by **100,000** microAlgos.
[reference](https://developer.algorand.org/docs/features/asa/#assets-overview)

## APPS_MINIMUM
When creating or opting into a stateful smart contract your minimum balance will be raised.

### The calculation for the amount for creator:
`100000*(1+ExtraProgramPages) + (28500)*schema.NumUint + (50000)*schema.NumByteSlice`

### The calculation for the amount for opted in users:
`100000 + (28500)*schema.NumUint + (50000*schema.NumByteSlice)`

[reference](https://developer.algorand.org/docs/features/asc1/stateful/#minimum-balance-requirement-for-a-smart-contract)

### Example
A user has these assets and opted in apps:
```
goal account info -a DPDWFMOPSF4EXEO3DKEOA7NYEQZD3LVEJL6LWZOJKWS7VNYETOUHEGO3WQ
Created Assets:
	<none>
Held Assets:
	ID 2, BTC, balance 175.680000 BTC
	ID 5, ARCC, balance 190.680000 ARCC
	ID 11, BTC_ARCC_LP, balance 0.000000 MES_LP
	ID 29, BTC_ARCC_LP, balance 73.320000 MES_LP
	ID 51, ALGO_ARCC_LP, balance 0.000000 MES_LP
	ID 54, BTC_ALGO_LP, balance 15.000000 MES_LP
	ID 119, ARCC_BTC_LP, balance 36.000000 MES_LP
Created Apps:
	<none>
Opted In Apps:
	ID 12, local state used 0/8 uints, 0/3 byte slices
	ID 30, local state used 2/8 uints, 0/3 byte slices
	ID 52, local state used 0/8 uints, 0/3 byte slices
	ID 55, local state used 2/8 uints, 0/3 byte slices
	ID 120, local state used 2/8 uints, 0/3 byte slices
```

```
BASE_ALGO = 100.000
ASSET_MINIMUM = TOTAL_ASSETS * 100.000 = 700.000
APPS_MINIMUM = (TOTAL_APPS * 100.000) + (28.500 * 40) + (50.000 * 15) = 2.390.000
Min Balance = 3.190.000
```
