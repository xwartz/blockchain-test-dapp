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
    <div className="px-4 py-5 space-y-4 max-w-xl mx-auto">
      <Button
        variant="destructive"
        onClick={generateMnemonic}
        className="w-full sm:w-auto"
      >
        Generate Mnemonic
      </Button>
      <div className="space-y-1">
        <Label htmlFor="mnemonic">Mnemonic: </Label>
        <Textarea
          placeholder="Type your Mnemonic here."
          id="mnemonic"
          defaultValue={mnemonic}
          onChange={onMnemonicChange}
        />
      </div>
      <div className="space-y-1">
        <Select onValueChange={onSelectChange} value={selectedChainName}>
          <SelectTrigger className="w-full">
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
      <Button
        variant="secondary"
        onClick={generateAddress}
        className="w-full sm:w-auto"
      >
        Generate Address
      </Button>
    </div>
  )
}
