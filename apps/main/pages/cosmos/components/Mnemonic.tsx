import {
  Label,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ui/components'
import { chains } from 'chain-registry'

export function Mnemonic({
  generateMnemonic,
  mnemonic,
  selectedChainName,
  generateAddress,
  onMnemonicChange,
  onSelectChange,
}: {
  generateMnemonic: () => void
  generateAddress: () => void
  onMnemonicChange: React.ChangeEventHandler<HTMLTextAreaElement>
  onSelectChange: (value: string) => void
  mnemonic: string
  selectedChainName: string
}) {
  return (
    <div className="p-5 text-center">
      <Button variant="destructive" onClick={generateMnemonic}>
        Generate Mnemonic
      </Button>
      <div className="mt-2">
        <Label htmlFor="mnemonic">Mnemonic: </Label>
        <Textarea
          placeholder="Type your Mnemonic here."
          id="mnemonic"
          defaultValue={mnemonic}
          onChange={onMnemonicChange}
        />
      </div>
      <div className="mt-2 grid justify-items-center">
        <Select onValueChange={onSelectChange} value={selectedChainName}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a Chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Chains</SelectLabel>
              {chains.map((chain) => (
                <SelectItem key={chain.chain_name} value={chain.chain_name}>
                  {chain.chain_name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2">
        <Button variant="secondary" onClick={generateAddress}>
          Generate Address
        </Button>
      </div>
    </div>
  )
}
