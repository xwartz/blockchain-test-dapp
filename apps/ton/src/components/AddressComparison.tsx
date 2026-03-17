import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  useToast,
} from '@repo/ui'
import { TonWallet } from '../utils/ton/wallet.js'
import { mnemonicToPrivateKey, mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4, WalletContractV5R1 } from '@ton/ton'

interface AddressInfo {
  version: string
  address: string
  rawAddress: string
  config?: string
}

export default function AddressComparison() {
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [mnemonic, setMnemonic] = useState<string>('')
  const { toast } = useToast()

  // Test mnemonic - 替换为你自己的助记词进行测试
  const testMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  // BIP39 测试助记词
  const testBip39Mnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent'

  // TonKeeper 期望的地址
  const tonkeeperExpected = 'UQAzWZa6nM5mJev91wGc7VCSfBoIsYRqKJpV78N8Add9-RKY'

  const generateAddresses = useCallback(async () => {
    setIsGenerating(true)
    try {
      const mnemonicWords = testMnemonic.split(' ')
      const bip39Words = testBip39Mnemonic.split(' ')
      setMnemonic(testMnemonic)

      const addressList: AddressInfo[] = []
      const workchain = 0

      console.log('Testing TON mnemonic:', testMnemonic)
      console.log('Testing BIP39 mnemonic:', testBip39Mnemonic)

      // 方法1: 使用 TonKeeper 的标准 TON 助记词处理 (mnemonicToPrivateKey)
      try {
        console.log('Testing TonKeeper mnemonicToPrivateKey method...')
        const tonKeyPair = await mnemonicToPrivateKey(mnemonicWords)
        console.log(
          'TON mnemonicToPrivateKey Public Key:',
          tonKeyPair.publicKey.toString('hex'),
        )

        // V4R2 with no walletId (TonKeeper standard)
        const v4r2Ton = WalletContractV4.create({
          workchain,
          publicKey: tonKeyPair.publicKey,
        })

        addressList.push({
          version: 'V4R2 (TonKeeper mnemonicToPrivateKey)',
          address: v4r2Ton.address.toString({
            urlSafe: true,
            bounceable: false,
          }),
          rawAddress: `${
            v4r2Ton.address.workChain
          }:${v4r2Ton.address.hash.toString('hex')}`,
          config: 'mnemonicToPrivateKey + no walletId',
        })

        // V4R2 with different walletId values (test)
        const walletIds = [0, 1, 2, 3, 698983191]
        for (const walletId of walletIds) {
          const v4r2WithId = WalletContractV4.create({
            workchain,
            publicKey: tonKeyPair.publicKey,
            walletId,
          })

          addressList.push({
            version: `V4R2 (TonKeeper, walletId: ${walletId})`,
            address: v4r2WithId.address.toString({
              urlSafe: true,
              bounceable: false,
            }),
            rawAddress: `${
              v4r2WithId.address.workChain
            }:${v4r2WithId.address.hash.toString('hex')}`,
            config: `mnemonicToPrivateKey + walletId: ${walletId}`,
          })
        }

        // V5R1 with networkGlobalId: -239 (TonKeeper mainnet)
        const v5r1Ton = WalletContractV5R1.create({
          workchain,
          publicKey: tonKeyPair.publicKey,
          walletId: {
            networkGlobalId: -239,
          },
        })

        addressList.push({
          version: 'V5R1 (TonKeeper mnemonicToPrivateKey)',
          address: v5r1Ton.address.toString({
            urlSafe: true,
            bounceable: false,
          }),
          rawAddress: `${
            v5r1Ton.address.workChain
          }:${v5r1Ton.address.hash.toString('hex')}`,
          config: 'mnemonicToPrivateKey + networkGlobalId: -239',
        })
      } catch (error) {
        console.error('TonKeeper mnemonicToPrivateKey failed:', error)
      }

      // 方法2: 测试 BIP39 助记词支持
      try {
        console.log('Testing BIP39 mnemonic support...')
        const wallet = new TonWallet()

        // 测试使用我们的钱包类处理 BIP39 助记词
        const bip39V4r2Wallet = await wallet.createWallet(bip39Words, {
          version: 'v4R2',
        })
        addressList.push({
          version: 'V4R2 (Our BIP39 Support)',
          address: bip39V4r2Wallet.address,
          rawAddress: bip39V4r2Wallet.rawAddress || '',
          config: 'BIP39 mnemonic + TonWallet class',
        })

        const bip39V5r1Wallet = await wallet.createWallet(bip39Words, {
          version: 'v5R1',
        })
        addressList.push({
          version: 'V5R1 (Our BIP39 Support)',
          address: bip39V5r1Wallet.address,
          rawAddress: bip39V5r1Wallet.rawAddress || '',
          config: 'BIP39 mnemonic + V5R1 + networkGlobalId: -239',
        })
      } catch (error) {
        console.error('BIP39 support test failed:', error)
      }

      // 方法3: 使用我们原来的方法 (mnemonicToWalletKey)
      try {
        console.log('Testing our mnemonicToWalletKey method...')
        const ourKeyPair = await mnemonicToWalletKey(mnemonicWords)
        console.log(
          'Our mnemonicToWalletKey Public Key:',
          ourKeyPair.publicKey.toString('hex'),
        )

        // V4R2 with no walletId
        const v4r2Our = WalletContractV4.create({
          workchain,
          publicKey: ourKeyPair.publicKey,
        })

        addressList.push({
          version: 'V4R2 (Our mnemonicToWalletKey)',
          address: v4r2Our.address.toString({
            urlSafe: true,
            bounceable: false,
          }),
          rawAddress: `${
            v4r2Our.address.workChain
          }:${v4r2Our.address.hash.toString('hex')}`,
          config: 'mnemonicToWalletKey + no walletId',
        })

        // V5R1 with networkGlobalId: -239
        const v5r1Our = WalletContractV5R1.create({
          workchain,
          publicKey: ourKeyPair.publicKey,
          walletId: {
            networkGlobalId: -239,
          },
        })

        addressList.push({
          version: 'V5R1 (Our mnemonicToWalletKey)',
          address: v5r1Our.address.toString({
            urlSafe: true,
            bounceable: false,
          }),
          rawAddress: `${
            v5r1Our.address.workChain
          }:${v5r1Our.address.hash.toString('hex')}`,
          config: 'mnemonicToWalletKey + networkGlobalId: -239',
        })
      } catch (error) {
        console.error('Our mnemonicToWalletKey failed:', error)
      }

      // 方法4: 使用我们的钱包类 (for comparison)
      try {
        console.log('Testing our TonWallet class...')
        const wallet = new TonWallet()

        const v4r2Wallet = await wallet.createWallet(mnemonicWords, {
          version: 'v4R2',
        })
        addressList.push({
          version: 'V4R2 (Our TonWallet Class)',
          address: v4r2Wallet.address,
          rawAddress: v4r2Wallet.rawAddress || '',
          config: 'TonWallet class + default config',
        })

        const v5r1Wallet = await wallet.createWallet(mnemonicWords, {
          version: 'v5R1',
        })
        addressList.push({
          version: 'V5R1 (Our TonWallet Class)',
          address: v5r1Wallet.address,
          rawAddress: v5r1Wallet.rawAddress || '',
          config: 'TonWallet class + V5R1 config',
        })
      } catch (error) {
        console.error('Our TonWallet class failed:', error)
      }

      setAddresses(addressList)

      // 检查是否有匹配的地址
      const matchingAddresses = addressList.filter(
        (addr) => addr.address === tonkeeperExpected,
      )

      if (matchingAddresses.length > 0) {
        console.log('🎉 Found matching addresses:', matchingAddresses)
      } else {
        console.log('❌ No matching addresses found')
        console.log('Expected:', tonkeeperExpected)
        console.log(
          'Generated addresses:',
          addressList.map((a) => ({ version: a.version, address: a.address })),
        )
      }

      toast({
        title:
          matchingAddresses.length > 0
            ? '🎉 Match found!'
            : 'Addresses generated',
        description:
          matchingAddresses.length > 0
            ? `Found ${matchingAddresses.length} matching address(es)!`
            : 'Generated addresses with different methods',
      })
    } catch (error) {
      console.error('Failed to generate addresses:', error)
      toast({
        title: 'Generation failed',
        description: 'Failed to generate addresses. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [testMnemonic, toast, tonkeeperExpected])

  useEffect(() => {
    generateAddresses()
  }, [generateAddresses])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>TON 钱包地址比较 - 测试 TonKeeper 助记词方法</CardTitle>
          <CardDescription>
            比较 TonKeeper 的 mnemonicToPrivateKey 与我们的 mnemonicToWalletKey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">测试助记词:</h3>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
              {mnemonic || '正在生成...'}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">TonKeeper 期望地址:</h3>
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded text-sm font-mono">
              {tonkeeperExpected}
            </div>
          </div>

          <Button
            onClick={generateAddresses}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? '生成中...' : '重新生成地址'}
          </Button>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 className="font-medium text-sm mb-2">助记词验证测试:</h3>
            <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
              <p>测试不同助记词验证方法</p>
              <div className="mt-2 space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { mnemonicValidate } = await import('@ton/crypto')
                      const testWords = testMnemonic.split(' ')

                      console.log('Testing mnemonic validation...')
                      console.log('Mnemonic:', testMnemonic)
                      console.log('Word count:', testWords.length)

                      // 测试标准 TON 验证
                      const isValidTon = await mnemonicValidate(testWords)
                      console.log('Standard TON validation:', isValidTon)

                      // 测试 BIP39 验证
                      let isValidBip39 = false
                      try {
                        const { validateMnemonic } = await import('bip39')
                        isValidBip39 = validateMnemonic(testMnemonic)
                        console.log('BIP39 validation:', isValidBip39)
                      } catch (err) {
                        console.log('BIP39 not available:', err)
                      }

                      // 测试实际的密钥生成
                      let keyGenSuccess = false
                      try {
                        const { mnemonicToPrivateKey } =
                          await import('@ton/crypto')
                        const keyPair = await mnemonicToPrivateKey(testWords)
                        keyGenSuccess = !!keyPair
                        console.log('Key generation success:', keyGenSuccess)
                        console.log(
                          'Generated public key:',
                          keyPair.publicKey.toString('hex'),
                        )
                      } catch (err) {
                        console.log('Key generation failed:', err)
                      }

                      toast({
                        title: '助记词验证结果',
                        description: `TON: ${isValidTon}, BIP39: ${isValidBip39}, KeyGen: ${keyGenSuccess}`,
                      })
                    } catch (error) {
                      console.error('Validation test failed:', error)
                      toast({
                        title: '验证测试失败',
                        description:
                          error instanceof Error ? error.message : '未知错误',
                        variant: 'destructive',
                      })
                    }
                  }}
                >
                  测试助记词验证
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { Address } = await import('@ton/core')
                      const testAddress =
                        'UQA1boMy66RZJw4I8lM16baPx-W8dxD95oFfF40GukRbNmoa'

                      // 测试地址转换
                      if (testAddress.includes(':')) {
                        console.log(
                          '✅ Address is already in raw format:',
                          testAddress,
                        )
                      } else {
                        const addr = Address.parse(testAddress)
                        const rawFormat = `${
                          addr.workChain
                        }:${addr.hash.toString('hex')}`
                        console.log('🔄 User-friendly address:', testAddress)
                        console.log('🔄 Raw format:', rawFormat)

                        toast({
                          title: '地址转换测试',
                          description: `Raw format: ${rawFormat}`,
                        })
                      }
                    } catch (error) {
                      console.error('Address conversion test failed:', error)
                      toast({
                        title: '地址转换失败',
                        description:
                          error instanceof Error ? error.message : '未知错误',
                        variant: 'destructive',
                      })
                    }
                  }}
                >
                  测试地址格式转换
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {addresses.map((addressInfo, index) => {
              const isMatch = addressInfo.address === tonkeeperExpected
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    isMatch
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                      : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {addressInfo.version}
                      </h4>
                      {isMatch && (
                        <span className="text-green-600 font-bold text-xs">
                          ✅ TONKEEPER MATCH!
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      配置: {addressInfo.config}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        User-Friendly:
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs font-mono break-all">
                        {addressInfo.address}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Raw:
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs font-mono break-all">
                        {addressInfo.rawAddress}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-sm mb-2">助记词处理方法对比:</h3>
            <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
              <p>
                • <strong>TonKeeper:</strong> 使用 mnemonicToPrivateKey
              </p>
              <p>
                • <strong>Our Method:</strong> 使用 mnemonicToWalletKey
              </p>
              <p>
                • <strong>Our Class:</strong> 使用 TonWallet 类封装
              </p>
              <p>• 测试不同的 walletId 和 networkGlobalId 配置</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="font-medium text-sm mb-2">测试结果分析:</h3>
            <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
              <p>
                <strong>目标地址:</strong> {tonkeeperExpected}
              </p>
              <p>
                <strong>测试助记词:</strong> {testMnemonic}
              </p>
              <p>如果找到匹配项，将显示 TonKeeper 使用的具体方法</p>
              <p>
                <strong>检查控制台日志</strong>查看详细的公钥对比信息
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
