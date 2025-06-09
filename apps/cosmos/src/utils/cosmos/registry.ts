import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import { wasmTypes } from './wasm'

export const getRegistry = () => {
  return new Registry([...defaultRegistryTypes, ...wasmTypes])
}
