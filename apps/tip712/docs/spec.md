# TIP-712 钱包开发者完整指南

> **适用对象：** 需要为 TRON 钱包添加 TIP-712 签名支持的开发者
> **覆盖范围：** 规范原理、与 EIP-712 差异、数据结构、编码规则、三类 Permit 场景辨析、完整五层签名流程、原生平台实现（Browser Extension / React Native iOS & Android / Ledger）、完整代码示例

---

## 目录

1. [背景与动机](#1-背景与动机)
2. [TIP-712 vs EIP-712：核心差异](#2-tip-712-vs-eip-712核心差异)
3. [数据结构与编码规范](#3-数据结构与编码规范)
4. [Domain Separator（域分隔符）](#4-domain-separator域分隔符)
5. [三类 Permit 辨析：Permit / Permit2 / GasFree PermitTransfer](#5-三类-permit-辨析)
6. [类型系统详解](#6-类型系统详解)
7. [场景一：TRC-20 Permit（ERC-2612 风格）](#7-场景一trc-20-permit)
8. [场景二：Permit2（PermitTransferFrom）](#8-场景二permit2permittransferfrom)
9. [场景三：GasFree PermitTransfer](#9-场景三gasfree-permittransfer)
10. [完整签名流程：五层架构](#10-完整签名流程五层架构)
11. [钱包实现：请求响应与预览解析](#11-钱包实现请求响应与预览解析)
12. [v 字节标准化](#12-v-字节标准化)
13. [链 ID 速查表](#13-链-id-速查表)
14. [完整参考实现](#14-完整参考实现)
15. [常见陷阱与检查清单](#15-常见陷阱与检查清单)

---

## 1. 背景与动机

### 问题：裸十六进制签名

传统链上交易要求用户对裸 `rawData` 的 `keccak256` 哈希签名，钱包只能展示一串无意义的十六进制字符串，用户完全无法理解自己在授权什么。

### 解决方案：结构化类型数据签名

TIP-712 是 TRON 对以太坊 EIP-712 的移植与适配，让签名数据**有结构、有语义、可人类阅读**：

- 用户看到的是字段名称 + 值（"收款方: TXxx…, 金额: 100 USDT"）
- 钱包可对签名域（domain）做钓鱼防护
- 合约可重建相同哈希并验证签名者

TIP-712 是 TRON 生态中所有链下签名方案的基础，包括 GasFree 免 Gas 转账、Permit2 通用授权、以及各项目私有元交易协议。

---

## 2. TIP-712 vs EIP-712：核心差异

TIP-712 在 EIP-712 基础上做了三处 TRON 专属适配，**其余编码规则完全兼容**。

### 2.1 ChainId 裁剪（最重要！）

| 特性 | EIP-712 | TIP-712 |
|------|---------|---------|
| ChainId 计算 | `block.chainid`（完整 256-bit） | `block.chainid & 0xffffffff`（取低 32-bit） |

TRON 主网的完整 `block.chainid` 是一个 64 位整数，TIP-712 **只取最低 4 字节**：

```solidity
// Solidity >= 0.8.0
uint256 chainId = block.chainid & 0xffffffff;

// Solidity < 0.8.0 (assembly)
uint256 chainId;
assembly {
    chainId := and(chainid(), 0xffffffff)
}
```

主网完整 chainId 为 `0x000000002b6653dc`，裁剪后为 `0x2b6653dc`（十进制 728127452）。

> ⚠️ **这是最常见的坑**：链上合约、前端 SDK、钱包三端必须都使用裁剪后的值，任何一端不一致都会导致签名验证失败。

### 2.2 Address 类型编码

| 特性 | EIP-712 | TIP-712 |
|------|---------|---------|
| 地址格式 | 20-byte hex，直接编码为 uint160 | Base58Check 格式，**去除 0x41 前缀**后编码为 uint160 |

TRON 地址以 Base58Check 表示（如 `TXYZabc...`），内部是 21 字节（`0x41` + 20 字节 payload）。TIP-712 编码时：

1. Base58 解码得 21 字节
2. **去掉开头的 `0x41` 字节**，留 20 字节 payload
3. 左填零到 32 字节（uint160 标准编码）

```
TronAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
   hex(21B): 41 a614f803b6fd780986a42c78ec9c7f77e6ded13c
  去掉0x41:    a614f803b6fd780986a42c78ec9c7f77e6ded13c  ← 20 bytes
 uint160编码: 000000000000000000000000a614f803b6fd780986a42c78ec9c7f77e6ded13c
```

TronWeb 的 `signTypedData` 会自动处理这一转换；手动计算哈希时必须自行处理。

### 2.3 trcToken 原子类型

TRON 独有 `trcToken` 类型用于 TRC-10 代币 ID：

| 特性 | EIP-712 | TIP-712 |
|------|---------|---------|
| trcToken | 不存在 | 视为原子类型，编码方式与 uint256 完全相同 |

在 typeString 中直接写 `trcToken`，无需特殊处理，编码时等同于 `uint256`。

### 2.4 差异总结表

| 差异点 | EIP-712（Ethereum） | TIP-712（TRON） |
|--------|-------------------|----------------|
| chainId | `block.chainid` | `block.chainid & 0xffffffff` |
| address 编码 | 20-byte hex → uint160 | Base58 解码 → 去 0x41 前缀 → uint160 |
| 新原子类型 | 无 | `trcToken`（编码为 uint256） |
| 签名前缀 | `\x19\x01` | `\x19\x01`（**完全相同**） |
| 哈希算法 | keccak256 | keccak256（**完全相同**） |
| 结构编码规则 | EIP-712 规范 | **完全兼容 EIP-712**（除上述三点） |
| 钱包签名 API | `eth_signTypedData_v4` | `tronWeb.trx.signTypedData()` |
| s 值规范化 | EIP-2 要求 s ≤ n/2 | **无强制要求**，不需要规范化 s |

---

## 3. 数据结构与编码规范

### 3.1 最终签名消息结构

```
signingHash = keccak256(
    "\x19\x01"          ← 2 字节固定前缀（EIP-191）
    ‖ domainSeparator   ← 32 字节
    ‖ hashStruct(msg)   ← 32 字节
)
```

整个输入为 66 字节，输出 32 字节哈希，即 `signingHash`，这是传入签名引擎的最终值。

### 3.2 hashStruct 计算

```
hashStruct(s)  = keccak256(typeHash ‖ encodeData(s))
typeHash       = keccak256(encodeType(S))
encodeType(S)  = S.name + "(" + field1.type + " " + field1.name + "," + ... + ")"
```

若结构体引用了其他结构体，被引用类型的 encodeType 字符串**按字母序追加**到末尾（不重复）：

```
encodeType(Mail) =
  "Mail(Person from,Person to,string contents)"
  "Person(string name,address wallet)"
  ↑ Person 按字母序追加，注意无换行无空格
```

### 3.3 encodeData 字段编码规则

每个字段编码为恰好 **32 字节**：

| 类型 | 编码方式 |
|------|---------|
| `bool` | uint256（false=0, true=1） |
| `address` | uint160，**TRON 需去掉 0x41 前缀**，左填零 |
| `uint8`～`uint256` | 大端序，左填零到 32 字节 |
| `int8`～`int256` | 符号扩展到 256 位，大端序 |
| `bytes1`～`bytes31` | 右侧填零到 32 字节 |
| `bytes32` | 直接使用 |
| `bytes`（动态） | `keccak256(bytes 内容)` |
| `string` | `keccak256(utf8Bytes(string))` |
| `T[]` / `T[n]` | `keccak256(每个元素的 encodeData 拼接)` |
| struct | `hashStruct(struct 实例)`（递归） |
| `trcToken`（TRON） | 与 uint256 相同 |

---

## 4. Domain Separator（域分隔符）

Domain Separator 将签名绑定到特定合约 + 链 + 版本，防止跨应用重放攻击。

### 4.1 域类型结构

```
EIP712Domain = {
    name?:              string,   // 应用名称（如 "GasFreeController"）
    version?:           string,   // 版本（如 "V1.0.0"）
    chainId?:           uint256,  // = block.chainid & 0xffffffff（TRON 裁剪）
    verifyingContract?: address,  // 验证签名的合约地址（Base58）
    salt?:              bytes32   // 备用域分隔符（极少使用）
}
```

所有字段均为**可选**，但 typeHash 的字符串**只能包含实际存在的字段，且顺序固定**（name → version → chainId → verifyingContract → salt，跳过不存在的）。

### 4.2 Domain Separator 计算

```solidity
// Solidity 合约端（以含4个字段为例）
bytes32 domainSeparator = keccak256(abi.encode(
    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
    keccak256(bytes(name)),
    keccak256(bytes(version)),
    block.chainid & 0xffffffff,   // ← TRON 关键
    address(this)
));
```

### 4.3 各网络参数速查

| 网络 | chainId（裁剪后十六进制） | 十进制 |
|------|------------------------|-------|
| TRON 主网 | `0x2b6653dc` | 728127452 |
| Nile 测试网 | `0xcd8690dc` | 3448148188 |
| Shasta 测试网 | `0x94a9059e` | 2494104990 |

---

## 5. 三类 Permit 辨析

> **核心结论：Permit、Permit2 PermitTransferFrom、GasFree PermitTransfer 是三套完全独立的协议，仅签名机制（TIP-712）相同，消息语义、字段、执行合约各不相同。**

### 5.1 字段结构对比

```
ERC-2612 Permit（TRC-20 代币合约内）
─────────────────────────────────────
  owner    address  ← 代币所有者
  spender  address  ← 被授权方
  value    uint256  ← 授权金额
  nonce    uint256  ← 单调递增（per owner）
  deadline uint256  ← 授权过期时间
  用途：设置 allowance，等价链上 approve()

Permit2 PermitTransferFrom（Permit2 合约）
─────────────────────────────────────────
  permitted  TokenPermissions {
    token    address  ← 代币合约
    amount   uint256  ← 最大可转金额
  }
  spender    address  ← 调用 permitTransferFrom 的合约
  nonce      uint256  ← 无序 bitmap nonce（不可重放）
  deadline   uint256  ← 签名过期时间
  用途：一次性签名授权 + 即时执行转账

GasFree PermitTransfer（GasFreeController 合约）
────────────────────────────────────────────────
  token           address  ← 代币合约
  serviceProvider address  ← 中继服务商
  user            address  ← 用户真实 EOA 地址
  receiver        address  ← 收款地址（最终目标）
  value           uint256  ← 转账金额
  maxFee          uint256  ← 最大手续费上限
  deadline        uint256  ← 签名过期时间
  version         uint256  ← 签名算法版本（当前为 1）
  nonce           uint256  ← 单调递增（从 API 获取）
  用途：委托服务商代为转账并代付 Gas
```

### 5.2 本质区别

| 维度 | Permit | Permit2 PermitTransferFrom | GasFree PermitTransfer |
|------|--------|--------------------------|----------------------|
| **协议来源** | Ethereum ERC-2612（TRON 无正式 TIP） | Uniswap Permit2（已移植 TRON） | GasFree.io 私有协议 |
| **执行合约** | 代币合约自身 | Permit2 合约 | GasFreeController 合约 |
| **主要动作** | 设置 allowance | 验签 + 执行转账 | 验签 + 中继转账 + 代付 Gas |
| **Spender** | ✅ 有（被授权方） | ✅ 有（调用方合约） | ❌ 无，改为 serviceProvider |
| **Receiver** | ❌ 无 | ❌ 无（在 TransferDetails 里） | ✅ 直接包含 |
| **手续费字段** | ❌ 无 | ❌ 无 | ✅ maxFee |
| **Nonce 机制** | 单调递增 | 无序 bitmap | 单调递增（服务端管理） |
| **TRON 成熟度** | ⚠️ 无标准，无主流代币支持 | ✅ 已有主网合约 | ✅ 生产运行中 |

### 5.3 TRON 社区对 Permit（ERC-2612）的现状

**TRON 官方 TRC-20 标准从未纳入 `permit()` 函数，也没有等同于以太坊 ERC-2612 的正式 TIP。**

- TRON 上最重量级的代币 **USDT**（`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`）不支持 permit
- Sun.io、JustLend 等主流 DeFi 协议依赖传统链上 `approve`，没有 permit 流
- 社区没有提出正式 TIP，也没有头部项目推动

原因分析：TRON 的能量/带宽机制使得链上 Gas 费用极低，permit 优化 UX 的动力不如以太坊强烈；GasFree 协议从另一个方向解决了用户免 Gas 问题，分流了需求。

**技术上完全可以移植**（TVM 与 EVM 高度兼容），修改点只有 domain separator 中的 chainId：

```solidity
// 唯一修改：chainId 裁剪
uint256 chainId = block.chainid & 0xffffffff;  // ← 仅此一处不同于 ETH 版本
```

其余 permit 逻辑（typeHash、encodeData、ecrecover）与以太坊完全一致。

---

## 6. 类型系统详解

### 6.1 types 对象结构

`types` 是一个 JSON 对象，key 为结构体名，value 为字段数组（不包含 `EIP712Domain`）：

```json
{
  "TypeName": [
    { "name": "fieldName", "type": "fieldType" },
    ...
  ]
}
```

### 6.2 完整示例（含嵌套结构体）

```json
{
  "domain": {
    "name": "TRON Mail",
    "version": "1",
    "chainId": "0x2b6653dc",
    "verifyingContract": "TUe6BwpA7sVTDKaJQoia7FWZpC9sK8WM2t"
  },
  "types": {
    "Person": [
      { "name": "name",   "type": "string"  },
      { "name": "wallet", "type": "address" }
    ],
    "Mail": [
      { "name": "from",     "type": "Person" },
      { "name": "to",       "type": "Person" },
      { "name": "contents", "type": "string" }
    ]
  },
  "primaryType": "Mail",
  "message": {
    "from":     { "name": "Cow", "wallet": "TUg28KYvCXWW81EqMUeZvCZmZw2BChk1HQ" },
    "to":       { "name": "Bob", "wallet": "TT5rFsXYCrnzdE2q1WdR9F2SuVY59A4hoM" },
    "contents": "Hello, Bob!"
  }
}
```

Mail 的 typeHash 计算（Person 按字母序追加）：

```
encodeType = "Mail(Person from,Person to,string contents)Person(string name,address wallet)"
typeHash   = keccak256(encodeType)
```

### 6.3 含 trcToken 的示例

```json
{
  "types": {
    "AssetTransfer": [
      { "name": "from",   "type": "address"  },
      { "name": "to",     "type": "address"  },
      { "name": "id",     "type": "trcToken" },
      { "name": "amount", "type": "uint256"  }
    ]
  }
}
```

typeString：`"AssetTransfer(address from,address to,trcToken id,uint256 amount)"`

---

## 7. 场景一：TRC-20 Permit

### 7.1 场景说明

Permit 允许用户通过链下签名代替链上 `approve()`，DApp 在调用 `transferFrom` 前先调用 `permit()` 完成授权，实现单笔交易完成授权+操作。

**当前状态：TRON 无统一标准，无主流代币支持，需要代币合约方自行实现。**

### 7.2 数据结构

```json
{
  "domain": {
    "name": "MyToken",
    "version": "1",
    "chainId": "0x2b6653dc",
    "verifyingContract": "<token_contract_address>"
  },
  "types": {
    "Permit": [
      { "name": "owner",    "type": "address" },
      { "name": "spender",  "type": "address" },
      { "name": "value",    "type": "uint256" },
      { "name": "nonce",    "type": "uint256" },
      { "name": "deadline", "type": "uint256" }
    ]
  },
  "primaryType": "Permit",
  "message": {
    "owner":    "<token_owner_address>",
    "spender":  "<spender_address>",
    "value":    "1000000000",
    "nonce":    "0",
    "deadline": "1735689600"
  }
}
```

### 7.3 typeHash（与 ERC-2612 完全相同）

```
keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
// = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9
```

### 7.4 合约实现（Solidity，仅修改 chainId 计算）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract TRC20Permit {
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;

    constructor(string memory name) {
        uint256 chainId = block.chainid & 0xffffffff; // ← TRON 唯一修改点
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes("1")),
            chainId,
            address(this)
        ));
    }

    function permit(
        address owner, address spender, uint256 value,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external {
        require(block.timestamp <= deadline, "Permit: expired");
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0) && recovered == owner, "Permit: invalid signature");
        _approve(owner, spender, value);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual;
}
```

### 7.5 前端签名

```javascript
const domain = {
  name: "MyToken",
  version: "1",
  chainId: "0x2b6653dc",
  verifyingContract: tokenAddress,
};

const types = {
  Permit: [
    { name: "owner",    type: "address" },
    { name: "spender",  type: "address" },
    { name: "value",    type: "uint256" },
    { name: "nonce",    type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const message = {
  owner:    userAddress,
  spender:  spenderAddress,
  value:    "1000000000",
  nonce:    (await tokenContract.nonces(userAddress).call()).toString(),
  deadline: Math.floor(Date.now() / 1000 + 3600).toString(),
};

// TronWeb 5.x+
const signature = await tronWeb.trx.signTypedData(domain, types, message);
// TronWeb 4.x（旧 API）
const signature = await tronWeb.trx._signTypedData(domain, types, message);
```

---

## 8. 场景二：Permit2（PermitTransferFrom）

### 8.1 场景说明

Permit2 是 Uniswap 的通用授权/元交易基础设施，已移植到 TRON（主网合约 `TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m`，由 Atum Labs 维护）。

用户只需一次性 `approve` Permit2 合约，之后任何协议都可通过签名转账，**无需对每个协议单独 approve**。

### 8.2 核心数据结构

```json
{
  "domain": {
    "name": "Permit2",
    "chainId": "0x2b6653dc",
    "verifyingContract": "TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m"
  },
  "types": {
    "PermitTransferFrom": [
      { "name": "permitted", "type": "TokenPermissions" },
      { "name": "spender",   "type": "address"          },
      { "name": "nonce",     "type": "uint256"          },
      { "name": "deadline",  "type": "uint256"          }
    ],
    "TokenPermissions": [
      { "name": "token",  "type": "address" },
      { "name": "amount", "type": "uint256" }
    ]
  },
  "primaryType": "PermitTransferFrom",
  "message": {
    "permitted": {
      "token":  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "amount": "1000000"
    },
    "spender":  "<dapp_contract_address>",
    "nonce":    "12345678901234567890",
    "deadline": "1735689600"
  }
}
```

> **重要**：domain **没有 `version` 字段**，仅含 `name` + `chainId` + `verifyingContract`。

### 8.3 typeHash（含嵌套类型，按字母序）

```
// TokenPermissions typeHash
keccak256("TokenPermissions(address token,uint256 amount)")

// PermitTransferFrom typeHash（TokenPermissions 按字母序追加）
keccak256(
  "PermitTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline)"
  "TokenPermissions(address token,uint256 amount)"
)
```

### 8.4 无序 Nonce 机制（BitMap）

Permit2 使用 bitmap 实现不可重用的无序 nonce：

```
nonce 的高 248 位 = wordPos（bitmap 中的行）
nonce 的低   8 位 = bitPos（bitmap 中的列）

bitmap[owner][wordPos] 中对应 bitPos 的 bit 从 0 → 1（只能翻转一次）
```

nonce 可乱序使用，但同一个 bit 只能使用一次，防止重放。

### 8.5 前端签名

```javascript
const permit2Address = "TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m";

const domain = {
  name: "Permit2",
  chainId: Number("0x2b6653dc"),
  verifyingContract: permit2Address,
  // 注意：没有 version 字段
};

const types = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender",   type: "address"          },
    { name: "nonce",     type: "uint256"          },
    { name: "deadline",  type: "uint256"          },
  ],
  TokenPermissions: [
    { name: "token",  type: "address" },
    { name: "amount", type: "uint256" },
  ],
};

const message = {
  permitted: {
    token:  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    amount: "1000000",
  },
  spender:  dappContractAddress,
  nonce:    generateNonce(),
  deadline: Math.floor(Date.now() / 1000 + 1800).toString(),
};

const signature = await tronWeb.trx.signTypedData(domain, types, message);

// DApp 随后调用合约
await permit2Contract.permitTransferFrom(
  permit,          // { permitted: { token, amount }, nonce, deadline }
  transferDetails, // { to: recipient, requestedAmount: amount }
  ownerAddress,
  signature
).send();
```

### 8.6 带 Witness 的扩展签名

Permit2 支持在签名中附加任意应用数据（witness），用于协议级验证：

```javascript
const types = {
  PermitWitnessTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender",   type: "address"          },
    { name: "nonce",     type: "uint256"          },
    { name: "deadline",  type: "uint256"          },
    { name: "witness",   type: "ExampleTrade"     }, // ← 附加数据
  ],
  TokenPermissions: [
    { name: "token",  type: "address" },
    { name: "amount", type: "uint256" },
  ],
  ExampleTrade: [
    { name: "exampleTokenAddress",     type: "address" },
    { name: "exampleMinimumAmountOut", type: "uint256" },
  ],
};
```

### 8.7 AllowanceTransfer（持久授权，含过期时间）

```json
{
  "types": {
    "PermitSingle": [
      { "name": "details",     "type": "PermitDetails" },
      { "name": "spender",     "type": "address"       },
      { "name": "sigDeadline", "type": "uint256"       }
    ],
    "PermitDetails": [
      { "name": "token",      "type": "address" },
      { "name": "amount",     "type": "uint160" },
      { "name": "expiration", "type": "uint48"  },
      { "name": "nonce",      "type": "uint48"  }
    ]
  },
  "primaryType": "PermitSingle"
}
```

---

## 9. 场景三：GasFree PermitTransfer

### 9.1 场景说明

GasFree 是 TRON 上的无 Gas TRC-20 转账协议。用户签名授权，由服务商代为广播并代付 Gas（从转账金额中扣除），实现**零 TRX 余额也能转账 USDT** 的体验。

```
用户（无 TRX）
  │
  ├─ 签名 PermitTransfer
  │    token / serviceProvider / user / receiver / value / maxFee / ...
  │
  └─ 提交签名到 GasFree Provider API
              │
              ├─ 验证签名
              ├─ 扣除 maxFee 以内的手续费
              └─ 广播到 TRON 链（代付 Gas）
```

### 9.2 GasFree Domain 配置

| 网络 | chainId | verifyingContract |
|------|---------|-------------------|
| 主网 | `0x2b6653dc` | `TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U` |
| Nile 测试网 | `0xcd8690dc` | `THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc` |

```json
{
  "name": "GasFreeController",
  "version": "V1.0.0",
  "chainId": "0x2b6653dc",
  "verifyingContract": "TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U"
}
```

### 9.3 PermitTransfer 完整结构

```json
{
  "domain": {
    "name": "GasFreeController",
    "version": "V1.0.0",
    "chainId": "0x2b6653dc",
    "verifyingContract": "TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U"
  },
  "types": {
    "PermitTransfer": [
      { "name": "token",           "type": "address" },
      { "name": "serviceProvider", "type": "address" },
      { "name": "user",            "type": "address" },
      { "name": "receiver",        "type": "address" },
      { "name": "value",           "type": "uint256" },
      { "name": "maxFee",          "type": "uint256" },
      { "name": "deadline",        "type": "uint256" },
      { "name": "version",         "type": "uint256" },
      { "name": "nonce",           "type": "uint256" }
    ]
  },
  "primaryType": "PermitTransfer",
  "message": {
    "token":           "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "serviceProvider": "TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp",
    "user":            "<user_eoa_address>",
    "receiver":        "<receiver_address>",
    "value":           "90000000",
    "maxFee":          "2000000",
    "deadline":        "1735689600",
    "version":         "1",
    "nonce":           "0"
  }
}
```

### 9.4 字段说明

| 字段 | 说明 |
|------|------|
| `token` | TRC-20 合约地址（如 USDT） |
| `serviceProvider` | GasFree 服务商地址（从 API 获取） |
| `user` | 用户**真实 EOA 地址**，不是 GasFree 合约地址！ |
| `receiver` | 最终收款地址 |
| `value` | 转账金额（最小单位，USDT 为 6 位小数） |
| `maxFee` | 最大可接受手续费（含转账费 + 账号激活费） |
| `deadline` | 签名过期时间戳（秒级 Unix 时间） |
| `version` | 签名算法版本，当前固定为 `1` |
| `nonce` | 防重放 nonce，从 GasFree API 获取最新值 |

### 9.5 GasFree 地址派生

GasFree 为每个用户创建一个专属 CREATE2 智能合约地址（用于持有代币，由服务商管理转出权限）：

```javascript
import { TronGasFree } from "@gasfree/gasfree-sdk";

const tronGasFree = new TronGasFree({ chainId: Number("0x2b6653dc") });

// user 持有 TRX EOA 地址，gasFreeAddress 是对应的托管合约地址
const gasFreeAddress = tronGasFree.generateGasFreeAddress(userEOAAddress);
```

`user` 字段填 EOA 地址，`receiver` 可以是任意地址（包括另一个 GasFree 合约地址）。

### 9.6 前端签名

```javascript
import { TronGasFree } from "@gasfree/gasfree-sdk";

const tronGasFree = new TronGasFree({ chainId: Number("0x2b6653dc") });

// SDK 自动组装标准 TIP-712 结构
const { domain, types, message } = tronGasFree.assembleGasFreeTransactionJson({
  token:           "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  serviceProvider: "TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp",
  user:            userAddress,   // ← EOA 地址
  receiver:        receiverAddress,
  value:           "90000000",
  maxFee:          "2000000",
  deadline:        Math.floor(Date.now() / 1000 + 3600).toString(),
  version:         "1",
  nonce:           await fetchLatestNonce(userAddress), // 从 API 获取
});

const signature = await tronWeb.trx._signTypedData(domain, types, message);
```

### 9.7 Ledger 硬件钱包签名

Ledger 不支持 `signTypedData`，需传入裸哈希：

```javascript
import AppTrx from "@ledgerhq/hw-app-trx";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

const { permitTransferMessageHash } = tronGasFree.getGasFreeLedgerRawHash({
  message: { token, serviceProvider, user, receiver, value, maxFee, deadline, version, nonce },
});

const transport = await TransportWebHID.create();
const app = new AppTrx(transport);
const result = await app.signTransactionHash(derivationPath, permitTransferMessageHash);
// result: { v, r, s }
```

---

## 10. 完整签名流程：五层架构

TIP-712 签名从 DApp 发起到原生签名完成，经过五个明确的层次，每层职责独立。

### 层次一：DApp 发起请求

DApp 通过 TronLink 注入的 provider 或 WalletConnect 发送签名请求：

```javascript
// 方式 A：通过 TronWeb API（TronLink 扩展场景）
const signature = await window.tronLink.tronWeb.trx.signTypedData(
  domain,       // { name, version?, chainId, verifyingContract? }
  types,        // { TypeName: [{ name, type }] }
  message,      // 实际数据，不传 privateKey → 由钱包持有私钥
);

// 方式 B：通过底层 Provider（兼容多钱包）
const signature = await window.tronLink.request({
  method: "tron_signTypedData",    // TRON 原生方法名
  // 部分钱包也接受：
  // method: "eth_signTypedData_v4",
  params: [
    userAddress,
    JSON.stringify({ domain, types, primaryType, message })
  ]
});
```

**完整 Payload 类型定义：**

```typescript
interface TIP712Payload {
  domain: {
    name?:              string;
    version?:           string;
    chainId?:           number | string;  // 十进制或十六进制字符串
    verifyingContract?: string;           // Base58 地址
    salt?:              string;           // bytes32 hex
  };
  types: {
    // key 为类型名，value 为字段列表
    // 不包含 EIP712Domain（由钱包自动处理）
    [typeName: string]: Array<{ name: string; type: string }>;
  };
  primaryType: string;                    // 顶层消息类型名
  message: Record<string, unknown>;       // 实际数据
}
```

---

### 层次二：钱包 JS 层解析与验证

钱包接收到请求后，在返回用户确认之前完成以下验证：

```
收到 TIP712Payload
    │
    ├─ [1] 字段完整性检查
    │       必须存在: types, primaryType, message
    │       primaryType 必须在 types 中有定义
    │
    ├─ [2] chainId 验证
    │       requested = Number(domain.chainId) & 0xffffffff
    │       current   = getCurrentNetworkChainId() & 0xffffffff
    │       if requested ≠ current → 报错 "Chain ID Mismatch"
    │
    ├─ [3] 类型字符串构建（用于展示 + 后续哈希）
    │       encodeType(primaryType, types)
    │       → "PermitTransfer(address token,address serviceProvider,...)"
    │
    ├─ [4] 递归解析 message 字段 → 构建可读预览（见第 11 节）
    │
    ├─ [5] 安全警告检查
    │       · verifyingContract 是否已知合约？
    │       · deadline 是否已过期？是否超过 30 天？
    │       · 金额是否异常大？
    │
    ├─ [6] 展示确认 UI，等待用户操作
    │       用户拒绝 → throw Error("User rejected")
    │       用户确认 → 继续
    │
    └─ [7] 将 { domain, types, primaryType, message } 传给哈希计算层
```

---

### 层次三：哈希计算（纯确定性，无副作用）

这一步完全在 JS/TS 层完成，是纯函数，不需要网络，不需要密钥。

```
输入: { domain, types, primaryType, message }

Step 1 ── 计算 domainTypeHash
  typeString = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  domainTypeHash = keccak256(utf8Bytes(typeString))

Step 2 ── 计算 domainSeparator（32 字节）
  domainEncoded = abi.encode(
      domainTypeHash,
      keccak256(utf8("GasFreeController")),   // name → string → keccak
      keccak256(utf8("V1.0.0")),              // version → string → keccak
      uint256(0x2b6653dc),                    // chainId，已裁剪，左填零32字节
      uint160(base58Decode(contractAddr))     // address，去0x41，左填零32字节
  )
  domainSeparator = keccak256(domainEncoded)

Step 3 ── 计算 messageTypeHash
  typeString = "PermitTransfer(address token,address serviceProvider,...)"
  messageTypeHash = keccak256(utf8Bytes(typeString))

Step 4 ── 计算 messageHash（32 字节）
  messageEncoded = abi.encode(
      messageTypeHash,
      uint160(base58Decode(msg.token)),           // address
      uint160(base58Decode(msg.serviceProvider)),  // address
      uint160(base58Decode(msg.user)),             // address
      uint160(base58Decode(msg.receiver)),         // address
      uint256(msg.value),                          // uint256
      uint256(msg.maxFee),                         // uint256
      uint256(msg.deadline),                       // uint256
      uint256(msg.version),                        // uint256
      uint256(msg.nonce)                           // uint256
  )
  messageHash = keccak256(messageEncoded)

Step 5 ── 计算 signingHash（32 字节，最终传给签名引擎）
  signingHash = keccak256(
      bytes2(0x1901)      // 2 字节固定前缀
      ‖ domainSeparator   // 32 字节
      ‖ messageHash       // 32 字节
  )
  // 输入共 66 字节，输出 32 字节

输出: signingHash（32 字节 hex string "0x..."）
```

**中间值示例（用于调试验证）：**

```
domainTypeHash:  0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866
domainSeparator: 0xe4d66d57...（根据合约地址和 chainId 确定）
messageTypeHash: 0x6d77b5a5...（由 typeString 唯一确定）
messageHash:     0x3a8c721f...（由具体消息数据确定）
signingHash:     0xf1a2b3c4...（最终传给签名引擎的 32 字节）
```

---

### 层次四：密钥管理与原生签名

**signingHash（32 字节）** 传入密钥管理层，根据密钥存储方式分三种架构：

---

#### 架构 A：浏览器扩展（TronLink 等）

```
Popup / Content Script
    │  signingHash: "0xf1a2b3c4..." (string)
    │
    │  chrome.runtime.sendMessage()
    ▼
Background Service Worker（隔离环境，持有加密 Keystore）
    │
    ├─ 解密 Keystore → privateKey: Uint8Array(32)
    │
    ├─ @noble/secp256k1（纯 JS，无原生依赖）
    │    const msgBytes = hexToBytes(signingHash)      // 32 bytes
    │    const sig = secp256k1.sign(msgBytes, privKey)
    │    // sig.r: bigint, sig.s: bigint, sig.recovery: 0|1
    │
    └─ 序列化
         r = sig.r.toString(16).padStart(64, '0')  // 32 bytes hex
         s = sig.s.toString(16).padStart(64, '0')  // 32 bytes hex
         v = (sig.recovery + 27).toString(16)       // "1b" 或 "1c"
         result = "0x" + r + s + v                  // 65 bytes hex string
```

---

#### 架构 B：React Native 移动钱包

RN 中 JS 层只负责传递哈希，签名在原生层完成：

```
React Native JS 层（Metro bundler）
    │
    │  const sigHex = await NativeModules.TronSigner.sign(
    │      signingHash,    // "0xf1a2b3c4..." 32 bytes hex
    │      keyId           // Keychain/Keystore 中的密钥标识符
    │  );
    │
    ▼
iOS 原生层（Swift / Objective-C）
────────────────────────────────
  // 从 Keychain / Secure Enclave 读取私钥
  let privKeyData: Data = readFromKeychain(keyId: keyId)  // 32 bytes

  // 将 hex string 转换为 Data
  let msgData = Data(hex: signingHash)  // 32 bytes

  // 使用 secp256k1 C 库（bitcoin-core/secp256k1）
  var ctx = secp256k1_context_create(UInt32(SECP256K1_CONTEXT_SIGN))
  var recoverableSig = secp256k1_ecdsa_recoverable_signature()

  secp256k1_ecdsa_sign_recoverable(
      ctx,
      &recoverableSig,
      [UInt8](msgData),       // 32 字节消息哈希（直接传入，无需再 hash）
      [UInt8](privKeyData),   // 32 字节私钥
      nil,                    // 使用默认 nonce 函数（RFC 6979）
      nil
  )

  // 序列化为紧凑格式
  var output = [UInt8](repeating: 0, count: 64)
  var recid: Int32 = 0
  secp256k1_ecdsa_recoverable_signature_serialize_compact(
      ctx, &output, &recid, &recoverableSig
  )

  // 组装结果
  let r = Data(output[0..<32]).hexString    // 32 bytes
  let s = Data(output[32..<64]).hexString   // 32 bytes
  let v = String(format: "%02x", recid + 27) // "1b" 或 "1c"
  return "0x" + r + s + v                   // 65 bytes hex

Android 原生层（Kotlin / Java）
────────────────────────────────
  // 从 Android Keystore 或加密存储读取私钥
  val privKeyBytes: ByteArray = readFromKeystore(keyId)  // 32 bytes
  val msgBytes: ByteArray = hexStringToBytes(signingHash) // 32 bytes

  // 方案 A：Bouncy Castle
  val privKey = ECPrivateKeyParameters(
      BigInteger(1, privKeyBytes),
      ECNamedCurveTable.getParameterSpec("secp256k1").let {
          ECDomainParameters(it.curve, it.g, it.n, it.h)
      }
  )
  val signer = ECDSASigner(HMacDSAKCalculator(SHA256Digest()))
  signer.init(true, privKey)
  val components = signer.generateSignature(msgBytes)  // [r, s]
  // 注意：Bouncy Castle 不直接返回 recovery id，需手动计算
  // 推荐使用方案 B

  // 方案 B：web3j 的 Sign.signMessage（无 hash，直接签原始字节）
  val credentials = Credentials.create(Numeric.toHexString(privKeyBytes))
  val sig = Sign.signMessage(msgBytes, credentials.ecKeyPair, false)
  // false = 不对 msgBytes 做二次 keccak，直接签名
  val r = Numeric.toHexString(sig.r).removePrefix("0x")
  val s = Numeric.toHexString(sig.s).removePrefix("0x")
  val v = String.format("%02x", sig.v[0].toInt())
  return "0x" + r + s + v
```

> ⚠️ **关键注意**：TIP-712 消息签名时，`signingHash` 已经是最终的 32 字节 keccak256 结果，传入 secp256k1 签名函数时**不需要再做 SHA256 或 keccak256**。TRON 普通链上交易会对 rawData 做 SHA256，但 TIP-712 签名**不走那条路径**。

---

#### 架构 C：硬件钱包（Ledger）

Ledger 设备内部持有私钥，从不暴露，只接受原始哈希并返回签名：

```
JS 层（@ledgerhq/hw-app-trx）
    │
    │  // 直接传入 32 字节哈希（无法在设备上展示字段详情）
    │  const result = await app.signTransactionHash(
    │      "44'/195'/0'/0/0",       // BIP-44 派生路径
    │      signingHash.slice(2)     // 不含 0x 前缀的 hex string
    │  );
    │
    ▼
Ledger APDU 协议
    │  发送: 0xe0 0x08 0x00 0x00 <32 bytes hash>
    │       INS = 0x08 = INS_SIGN_TIP712_MESSAGE（或 INS_SIGN_TRANSACTION_HASH）
    │
    └─ 接收: { v: number(27|28), r: string, s: string }

// 重组签名
const signature = "0x" + result.r + result.s + result.v.toString(16).padStart(2, '0');
```

---

### 层次五：签名序列化与返回

所有架构的输出统一为 **65 字节 hex string**：

```
格式: 0x + r(32字节) + s(32字节) + v(1字节)
长度: 2 + 64 + 64 + 2 = 132 个字符

示例:
  0x
  72cc671f38be492773e2cd44c64535ab8825d8ab7b0e580ee45731d00fc0aa5a  ← r (32B)
  385bf816505e6c53864bc8539677f7c6a6ece907c94e02d473d392e364cfd56  ← s (32B)
  1c                                                                  ← v (1B, 0x1c=28)
```

**v 值规范化（如果原生层返回 0/1）：**

```javascript
function normalizeV(sig) {
  const raw = sig.startsWith("0x") ? sig.slice(2) : sig;
  const v = raw.slice(128, 130).toLowerCase();
  if (v === "00") return "0x" + raw.slice(0, 128) + "1b";
  if (v === "01") return "0x" + raw.slice(0, 128) + "1c";
  return "0x" + raw; // 已是 1b/1c，不需要处理
}
```

**TRON 签名与 Ethereum 的 s 值差异：**

Ethereum EIP-2 强制要求 `s ≤ secp256k1.n/2`（低 s 规范化），防止签名可延展性。TRON 官方文档和 java-tron 实现**没有这一要求**，钱包不需要对 s 做规范化处理。

---

### 完整时序图

```
DApp                  Wallet JS             哈希计算          密钥管理层           原生层
 │                       │                     │                  │                  │
 │── signTypedData() ───>│                     │                  │                  │
 │   {domain,types,msg}  │                     │                  │                  │
 │                       ├── validateChain()   │                  │                  │
 │                       ├── parsePreview()    │                  │                  │
 │                       ├── checkWarnings()   │                  │                  │
 │                       ├── showUI() ─────────────────────────────────── 用户确认
 │                       │<──────────────── confirmed ──────────────────────────────│
 │                       │                     │                  │                  │
 │                       ├── compute() ───────>│                  │                  │
 │                       │                     ├── typeHash()     │                  │
 │                       │                     ├── domainSep()   │                  │
 │                       │                     ├── msgHash()      │                  │
 │                       │                     └── signingHash    │                  │
 │                       │<── 0xf1a2b3c4... ───│                  │                  │
 │                       │                     │                  │                  │
 │                       ├── sign(hash) ───────────────────────> │                  │
 │                       │                     │                  ├── decrypt()      │
 │                       │                     │                  ├── sign(h,k) ────>│
 │                       │                     │                  │                  ├ secp256k1_sign()
 │                       │                     │                  │<── {r,s,recid} ──│
 │                       │                     │                  ├── encode(r,s,v)  │
 │                       │<──────────────────────── sig(65B) ────│                  │
 │                       ├── normalizeV()       │                  │                  │
 │<── "0x{r}{s}{v}" ────│                     │                  │                  │
 │                       │                     │                  │                  │
 │── 提交到服务端/合约 ──>│                     │                  │                  │
```

---

## 11. 钱包实现：请求响应与预览解析

### 11.1 预览字段递归解析

```typescript
interface PreviewField {
  label:    string;
  type:     string;
  value?:   string;
  raw?:     string;
  children?: PreviewField[];  // 嵌套结构体
}

function buildPreview(
  types: Record<string, Array<{name: string; type: string}>>,
  typeName: string,
  value: Record<string, unknown>
): PreviewField[] {
  const fields = types[typeName];
  if (!fields) return [{ label: typeName, type: "unknown", value: String(value) }];

  return fields.map((field) => {
    const raw = value[field.name];

    // 嵌套结构体 → 递归展开
    if (types[field.type]) {
      return {
        label: field.name,
        type: "struct",
        children: buildPreview(types, field.type, raw as Record<string, unknown>),
      };
    }

    // address → Base58 格式显示（已经是 Base58 则直接展示）
    if (field.type === "address") {
      return { label: field.name, type: "address", value: String(raw) };
    }

    // 金额字段 → 尝试换算为可读数值
    if (field.type === "uint256" && isAmountField(field.name)) {
      const amount = BigInt(String(raw));
      return {
        label: field.name,
        type:  "amount",
        value: formatAmount(amount, 6),   // USDT 精度
        raw:   String(raw),
      };
    }

    // 时间戳字段 → 转换为本地时间
    if (field.type === "uint256" && isTimestampField(field.name)) {
      const ts = Number(raw) * 1000;
      return {
        label: field.name,
        type:  "timestamp",
        value: new Date(ts).toLocaleString(),
        raw:   String(raw),
      };
    }

    // 其他字段 → 原始值显示
    return { label: field.name, type: field.type, value: String(raw) };
  });
}

const AMOUNT_FIELDS    = new Set(["value", "amount", "maxFee", "requestedAmount"]);
const TIMESTAMP_FIELDS = new Set(["deadline", "expiration", "sigDeadline", "validBefore", "validAfter"]);

function isAmountField(name: string)    { return AMOUNT_FIELDS.has(name); }
function isTimestampField(name: string) { return TIMESTAMP_FIELDS.has(name); }

function formatAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integer  = amount / divisor;
  const fraction = amount % divisor;
  return fraction === 0n
    ? integer.toString()
    : `${integer}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}
```

### 11.2 安全验证

```typescript
interface Warning {
  level:   "error" | "warning" | "info";
  message: string;
}

function validateSignRequest(payload: TIP712Payload, currentChainId: number): Warning[] {
  const warnings: Warning[] = [];

  // 1. ChainId 校验
  if (payload.domain.chainId !== undefined) {
    const requested = Number(payload.domain.chainId) & 0xffffffff;
    if (requested !== (currentChainId & 0xffffffff)) {
      warnings.push({
        level: "error",
        message: `链 ID 不匹配：请求签名 ${requested}，当前网络 ${currentChainId & 0xffffffff}`,
      });
    }
  }

  // 2. 已知合约检查
  const KNOWN_CONTRACTS = new Map([
    ["TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m", "Permit2"],
    ["TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U", "GasFreeController"],
  ]);
  const contractLabel = payload.domain.verifyingContract
    ? KNOWN_CONTRACTS.get(payload.domain.verifyingContract)
    : null;
  if (payload.domain.verifyingContract && !contractLabel) {
    warnings.push({ level: "warning", message: `未知合约：${payload.domain.verifyingContract}` });
  }

  // 3. Deadline 检查
  const deadline = findDeadline(payload.message);
  if (deadline !== null) {
    const now = Math.floor(Date.now() / 1000);
    if (deadline < now) {
      warnings.push({ level: "error", message: "授权已过期" });
    } else if (deadline > now + 86400 * 30) {
      warnings.push({ level: "warning", message: `授权有效期超过 30 天（至 ${new Date(deadline * 1000).toLocaleDateString()}）` });
    }
  }

  return warnings;
}

function findDeadline(message: Record<string, unknown>): number | null {
  const candidates = ["deadline", "expiration", "sigDeadline", "validBefore"];
  for (const key of candidates) {
    if (message[key] !== undefined) return Number(message[key]);
  }
  return null;
}
```

---

## 12. v 字节标准化

ECDSA 签名由 `r`（32B）+ `s`（32B）+ `v`（1B）= 65 字节组成。

| 来源 | v 原始值 | 含义 | 需要处理 |
|------|---------|------|---------|
| secp256k1 C 库 `recid` | 0 或 1 | recovery id | 需 +27 |
| TronWeb 旧版输出 | `00` / `01` | recovery id | 需 +27 |
| TronWeb 新版输出 | `1b` / `1c` | 已规范化 | 不需要 |
| Ledger hw-app-trx | 27 或 28 (number) | 已规范化 | 不需要 |
| web3j Sign.signMessage | 27 或 28 (byte) | 已规范化 | 不需要 |

**规范化函数：**

```typescript
function normalizeSignatureV(signature: string): string {
  const raw = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (raw.length !== 130) throw new Error(`签名长度异常: ${raw.length} chars，期望 130`);

  const v = raw.slice(128, 130).toLowerCase();
  if (v === "00") return "0x" + raw.slice(0, 128) + "1b";
  if (v === "01") return "0x" + raw.slice(0, 128) + "1c";
  if (v === "1b" || v === "1c") return "0x" + raw;
  throw new Error(`非法 v 值: ${v}`);
}

function splitSignature(signature: string): { v: number; r: string; s: string } {
  const normalized = normalizeSignatureV(signature);
  const raw = normalized.slice(2);
  return {
    r: "0x" + raw.slice(0,   64),
    s: "0x" + raw.slice(64, 128),
    v: parseInt(raw.slice(128), 16),  // 27 或 28
  };
}
```

> TRON 不要求 s ≤ n/2（低 s 规范化），钱包**无需**像以太坊 EIP-2 那样处理 s 值。

---

## 13. 链 ID 速查表

| 网络 | 完整 chainId (hex) | TIP-712 chainId（`& 0xffffffff`） | 十进制 |
|------|-------------------|----------------------------------|-------|
| TRON 主网 | `0x000000002b6653dc` | `0x2b6653dc` | 728127452 |
| Nile 测试网 | `0x00000000cd8690dc` | `0xcd8690dc` | 3448148188 |
| Shasta 测试网 | `0x0000000094a9059e` | `0x94a9059e` | 2494104990 |

```javascript
// JavaScript 中获取各网络的裁剪后 chainId
const CHAIN_IDS = {
  mainnet: Number("0x2b6653dc"),   // 728127452
  nile:    Number("0xcd8690dc"),   // 3448148188
  shasta:  Number("0x94a9059e"),   // 2494104990
};

// 从任意格式规范化 chainId
function normalizeChainId(chainId: number | string): number {
  return Number(chainId) & 0xffffffff;
}
```

---

## 14. 完整参考实现

### 14.1 手动 TIP-712 哈希计算（TypeScript，无框架依赖）

```typescript
import { keccak256 } from "ethereum-cryptography/keccak";
import {
  utf8ToBytes, hexToBytes, bytesToHex, concatBytes
} from "ethereum-cryptography/utils";
import bs58 from "bs58";

// ── 工具函数 ──────────────────────────────────────────────────────

function keccak(data: Uint8Array): string {
  return "0x" + bytesToHex(keccak256(data));
}

/** TRON Base58 地址 → 32 字节左填零 uint160 编码 */
function encodeTronAddress(base58Addr: string): string {
  const decoded = bs58.decode(base58Addr); // 25 bytes: [version(1)] + [payload(20)] + [checksum(4)]
  const payload = decoded.slice(1, 21);    // 取中间 20 字节，丢弃 0x41 前缀和 4 字节校验
  return "0x" + "00".repeat(12) + bytesToHex(payload);
}

function padUint256(value: bigint): string {
  if (value < 0n) {
    const mask = (1n << 256n) - 1n;
    return "0x" + (value & mask).toString(16).padStart(64, "0");
  }
  return "0x" + value.toString(16).padStart(64, "0");
}

// ── 类型编码 ──────────────────────────────────────────────────────

type TypeDef = Array<{ name: string; type: string }>;
type Types   = Record<string, TypeDef>;

/** 构建 encodeType 字符串，被引用类型按字母序追加 */
function encodeType(typeName: string, types: Types): string {
  const deps = new Set<string>();
  const collectDeps = (name: string) => {
    for (const field of types[name] ?? []) {
      if (types[field.type] && !deps.has(field.type)) {
        deps.add(field.type);
        collectDeps(field.type);
      }
    }
  };
  collectDeps(typeName);

  const buildDef = (name: string) =>
    name + "(" + (types[name] ?? []).map((f) => `${f.type} ${f.name}`).join(",") + ")";

  return buildDef(typeName) + [...deps].sort().map(buildDef).join("");
}

function typeHash(typeName: string, types: Types): string {
  return keccak(utf8ToBytes(encodeType(typeName, types)));
}

function encodeField(value: unknown, type: string, types: Types): string {
  if (types[type]) return hashStruct(value as Record<string, unknown>, type, types);

  if (type === "string") return keccak(utf8ToBytes(String(value)));
  if (type === "bytes")  return keccak(hexToBytes((value as string).replace("0x", "")));

  if (type === "address") {
    const v = String(value);
    return v.startsWith("T")
      ? encodeTronAddress(v)                          // Base58 → uint160
      : "0x" + v.replace("0x", "").padStart(64, "0"); // hex → uint160
  }

  if (type === "bool") return padUint256(value ? 1n : 0n);

  if (/^bytes\d+$/.test(type)) {
    const hex = (value as string).replace("0x", "");
    return "0x" + hex.padEnd(64, "0");  // bytes 类型右填零
  }

  if (/^(u?int\d*|trcToken)$/.test(type)) return padUint256(BigInt(String(value)));

  if (type.endsWith("]")) {
    const elemType = type.slice(0, type.lastIndexOf("["));
    const arr = Array.isArray(value) ? value : [value];
    const encoded = arr.map((v) => hexToBytes(encodeField(v, elemType, types).slice(2)));
    return keccak(concatBytes(...encoded));
  }

  throw new Error(`Unknown type: ${type}`);
}

function encodeData(value: Record<string, unknown>, typeName: string, types: Types): Uint8Array {
  const th = hexToBytes(typeHash(typeName, types).slice(2));
  const fields = (types[typeName] ?? []).map((field) =>
    hexToBytes(encodeField(value[field.name], field.type, types).slice(2))
  );
  return concatBytes(th, ...fields);
}

function hashStruct(value: Record<string, unknown>, typeName: string, types: Types): string {
  return keccak(encodeData(value, typeName, types));
}

// ── Domain Separator ──────────────────────────────────────────────

type Domain = {
  name?: string; version?: string;
  chainId?: number | string;
  verifyingContract?: string; salt?: string;
};

function buildDomainTypes(domain: Domain): Types {
  const fields: TypeDef = [];
  if (domain.name              != null) fields.push({ name: "name",              type: "string"  });
  if (domain.version           != null) fields.push({ name: "version",           type: "string"  });
  if (domain.chainId           != null) fields.push({ name: "chainId",           type: "uint256" });
  if (domain.verifyingContract != null) fields.push({ name: "verifyingContract", type: "address" });
  if (domain.salt              != null) fields.push({ name: "salt",              type: "bytes32" });
  return { EIP712Domain: fields };
}

function computeDomainSeparator(domain: Domain): string {
  const types = buildDomainTypes(domain);
  const normalizedDomain = {
    ...domain,
    chainId: domain.chainId != null
      ? String(Number(domain.chainId) & 0xffffffff)  // ← 关键裁剪
      : undefined,
  };
  return hashStruct(normalizedDomain as Record<string, unknown>, "EIP712Domain", types);
}

// ── 最终签名哈希 ──────────────────────────────────────────────────

function computeSigningHash(
  domain: Domain,
  types: Types,
  primaryType: string,
  message: Record<string, unknown>
): string {
  const ds = hexToBytes(computeDomainSeparator(domain).slice(2));
  const ms = hexToBytes(hashStruct(message, primaryType, types).slice(2));
  return keccak(concatBytes(hexToBytes("1901"), ds, ms));
}

// ── 使用示例：GasFree PermitTransfer ─────────────────────────────

const signingHash = computeSigningHash(
  {
    name: "GasFreeController",
    version: "V1.0.0",
    chainId: "0x2b6653dc",
    verifyingContract: "TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U",
  },
  {
    PermitTransfer: [
      { name: "token",           type: "address" },
      { name: "serviceProvider", type: "address" },
      { name: "user",            type: "address" },
      { name: "receiver",        type: "address" },
      { name: "value",           type: "uint256" },
      { name: "maxFee",          type: "uint256" },
      { name: "deadline",        type: "uint256" },
      { name: "version",         type: "uint256" },
      { name: "nonce",           type: "uint256" },
    ],
  },
  "PermitTransfer",
  {
    token:           "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    serviceProvider: "TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp",
    user:            "TYRhsi1fkke2tjdVW9XGYLjf8TgbbutEgY",
    receiver:        "TW1dWXfta5ygVN298JBN2UPhaSAUzo2owZ",
    value:           "3000000",
    maxFee:          "2000000",
    deadline:        "1735689600",
    version:         "1",
    nonce:           "0",
  }
);

console.log("signingHash:", signingHash);
// 将此值传入 secp256k1 签名引擎
```

### 14.2 链上验签（Solidity）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TIP712Verifier {
    bytes32 public immutable DOMAIN_SEPARATOR;

    bytes32 constant PERMIT_TRANSFER_TYPEHASH = keccak256(
        "PermitTransfer(address token,address serviceProvider,address user,"
        "address receiver,uint256 value,uint256 maxFee,uint256 deadline,"
        "uint256 version,uint256 nonce)"
    );

    constructor(string memory name, string memory version) {
        uint256 chainId = block.chainid & 0xffffffff; // ← TIP-712 关键
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            address(this)
        ));
    }

    function verifyPermitTransfer(
        address token, address serviceProvider, address user, address receiver,
        uint256 value, uint256 maxFee, uint256 deadline, uint256 version, uint256 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external view returns (bool) {
        require(block.timestamp <= deadline, "Expired");

        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TRANSFER_TYPEHASH,
            uint160(token),
            uint160(serviceProvider),
            uint160(user),
            uint160(receiver),
            value, maxFee, deadline, version, nonce
        ));

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recovered = ecrecover(digest, v, r, s);
        return recovered != address(0) && recovered == user;
    }

    function splitSignature(bytes memory sig)
        internal pure returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65, "Bad sig length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27; // 规范化 v
    }
}
```

---

## 15. 常见陷阱与检查清单

### 15.1 常见错误速查

| 错误现象 | 根本原因 | 解决方案 |
|---------|---------|---------|
| `ecrecover` 返回错误地址 | chainId 未做 `& 0xffffffff` | 前端、合约、钱包三端统一裁剪 |
| `ecrecover` 返回 address(0) | v 值是 0/1 而非 27/28 | 调用 `normalizeV()`，对 recovery id +27 |
| domain separator 不一致 | domain 字段顺序错误或包含了不该有的字段 | 按规范顺序，只包含合约实际使用的字段 |
| 地址编码错误 | 手动计算时未去掉 0x41 前缀 | Base58 解码后取 `[1:21]`，不取 `[0]` |
| Permit2 验签失败 | domain 中加了 `version` 字段 | Permit2 的 domain **没有** version |
| GasFree 签名被拒绝 | `user` 字段填入了 GasFree 合约地址 | `user` 必须是用户真实 EOA 地址 |
| 嵌套结构体哈希错误 | 忘记对嵌套结构体做 `hashStruct` | 结构体字段值 = `hashStruct(嵌套结构体)`，不是 encodeData |
| typeString 不匹配 | 字段间逗号后有空格 | 类型字符串中逗号后**无空格** |
| RN 原生签名结果错误 | 对 signingHash 做了二次 keccak/SHA256 | 直接对 32 字节哈希签名，不需要再 hash |
| 被引用类型顺序错误 | 手动拼接 typeString 时顺序错误 | 被引用类型必须**按字母序**追加 |

### 15.2 钱包实现完整检查清单

```
接口层
[ ] 支持 tron_signTypedData 方法名
[ ] 接收 { domain, types, primaryType, message } 标准结构
[ ] 能处理 chainId 为数字或十六进制字符串两种格式

验证层
[ ] domain.chainId & 0xffffffff === currentChainId & 0xffffffff
[ ] primaryType 存在于 types 定义中
[ ] 所有引用的子类型在 types 中均有定义
[ ] deadline/expiration 未过期

展示层
[ ] 展示 domain 信息（合约名/地址/网络）
[ ] address 字段以 Base58 格式展示
[ ] 金额字段换算为人类可读值（含精度）
[ ] 时间戳字段转换为本地时间
[ ] 嵌套结构体递归展开展示
[ ] 对未知合约显示警告
[ ] 对超长 deadline 显示提示

哈希计算层
[ ] chainId 裁剪（& 0xffffffff）
[ ] address 编码：Base58 → 去 0x41 → uint160（左填零）
[ ] string/bytes 动态类型：keccak256 哈希后编码
[ ] 嵌套结构体：hashStruct 递归计算
[ ] 被引用类型字母序追加到 typeString
[ ] bytes 类型右侧填零，uint/int 类型左侧填零
[ ] trcToken 与 uint256 编码相同

签名层
[ ] signingHash 直接传入 secp256k1，不做二次哈希
[ ] v 值规范化（recovery id 0/1 → 0x1b/0x1c）
[ ] 不需要规范化 s 值（TRON 无此要求）
[ ] Ledger 支持：暴露裸哈希签名接口
[ ] 签名结果为 65 字节 hex（0x + r32 + s32 + v1）
```

### 15.3 Domain 配置速查（各场景）

| 场景 | name | version | chainId (主网) | verifyingContract |
|------|------|---------|---------------|-------------------|
| TRC-20 Permit | 代币名称 | `"1"` | `0x2b6653dc` | 代币合约地址 |
| Permit2 SignatureTransfer | `"Permit2"` | ❌ 无此字段 | `0x2b6653dc` | `TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m` |
| GasFree PermitTransfer | `"GasFreeController"` | `"V1.0.0"` | `0x2b6653dc` | `TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U` |

### 15.4 typeString 格式规范

```
✅ 正确：逗号分隔，无空格，类型在前字段名在后
"PermitTransfer(address token,address serviceProvider,address user,address receiver,uint256 value,uint256 maxFee,uint256 deadline,uint256 version,uint256 nonce)"

✅ 正确：有嵌套类型时，按字母序追加
"PermitTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"

❌ 错误：逗号后有空格
"PermitTransfer(address token, address serviceProvider, ...)"

❌ 错误：被引用类型未追加（仅写主类型）
"PermitTransferFrom(TokenPermissions permitted,address spender,...)"

❌ 错误：被引用类型未按字母序
"PermitTransferFrom(...)TokenPermissions(...)ZType(...)"  // ZType 在 T 前
```

---

## 参考资料

- [TIP-712 规范](https://github.com/tronprotocol/tips/blob/master/tip-712.md)
- [EIP-712 规范](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-2612 Permit 标准](https://eips.ethereum.org/EIPS/eip-2612)
- [EIP-3009 TransferWithAuthorization](https://eips.ethereum.org/EIPS/eip-3009)
- [TronWeb API 文档](https://tronweb.network/docu/docs/API%20List/trx/signTypedData/)
- [GasFree SDK（JS）](https://github.com/gasfreeio/gasfree-sdk-js)
- [GasFree 规范文档](https://gasfree.io/specification-cn)
- [Permit2 for TRON（Atum Labs）](https://github.com/Atum-Labs/permit2-tron)
- [Uniswap Permit2 原版](https://github.com/Uniswap/permit2)
- [TRC-120 ECDSA 签名编码规范](https://github.com/tronprotocol/tips/issues/120)
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1)
- [bitcoin-core/secp256k1 C 库](https://github.com/bitcoin-core/secp256k1)
