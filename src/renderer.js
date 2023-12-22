/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring, decodeAddress } from '@polkadot/keyring'

import { u8aToHex } from '@polkadot/util'

import { cryptoWaitReady, mnemonicGenerate, keyExtractSuri } from '@polkadot/util-crypto'

const defaultData = {
  defaultWs: 'wss://eosla.com',
  defaultMnemonic: '',
  defaultName: 'DOTA'
}

let outputList = []

let globalApi

let runing = false

function convertAddressToPublicKey(address) {
    // 解码地址获取字节数组格式的公钥
    const publicKey = decodeAddress(address);

    // 将公钥转换为16进制格式
    return u8aToHex(publicKey);
}

async function main(defaultWs = defaultData.defaultWs, defaultMnemonic = '', defaultName = defaultData.defaultName) {
    // 连接到 Polkadot 节点


    //你的 wss 节点 https://www.quicknode.com/
    // const provider = new WsProvider('wss://1rpc.io/dot');
    // const provider = new WsProvider('wss://rpc.ibp.network/polkadot');
    const provider = new WsProvider(defaultWs || 'wss://eosla.com');
    const api = await ApiPromise.create({ provider });

    globalApi = api

    //你的助记词
    const mnemonic = defaultMnemonic

    const keyring =new Keyring({ type: "sr25519" });
    const account = keyring.createFromUri(mnemonic);


    // 生成新的密钥对
    keyring.setSS58Format(0);
    console.log('Polkadot', account.address);
    outputList.push('Polkadot Address:' + account.address)

    const publicKeyHex = convertAddressToPublicKey(account.address);


    // 构建交易
    const transfer = api.tx.balances.transferKeepAlive(
        publicKeyHex, // 目标地址
        0 // 转账金额
    );

    const remark = api.tx.system.remark(
        `{"p":"dot-20","op":"mint","tick":"${defaultName || 'DOTA'}"}` // 备注信息
    );

    let lastBlockNumber = 0;
    // 定期检查区块高度
    const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
        console.log(`当前区块高度: ${header.number}`);
        outputList.push(`Block: ${header.number}`)

        if (header.number > lastBlockNumber) {
            lastBlockNumber = header.number;
            try {
                // 签名并发送交易
                const hash = await api.tx.utility
                    .batchAll([transfer, remark])
                    .signAndSend(account);

              console.log('交易哈希:', hash.toHex());
              outputList.push('Mint successful, Tx Hash is: ' + hash.toHex())
            } catch (e) {
              console.log('交易失败:', e);
              outputList.push('Error:' + e.toString())
              if (!runing) {
                api.disconnect()
                return
              }
            }
        }
        const listWrap = document.getElementById('output-list')
        let str = ''
        outputList.forEach(item => {
          str += `<li>${item}</li>`
        })
        listWrap.innerHTML = str
        if (outputList.length > 1000) {
          outputList = outputList.slice(-1000)
        }
        listWrap.scrollTop = listWrap.scrollHeight
    });



}

async function generatePolkadotKeyPair() {
    // 等待 WASM 加密库初始化

    // we only need to do this once per app, somewhere in our init code
    // (when using the API and waiting on `isReady` this is done automatically)
    // await cryptoWaitReady();
    // const mnemonic = mnemonicGenerate();
    // console.log(mnemonic)
    //
    const keyring = new Keyring();
    // const pair = keyring.createFromUri(mnemonic);
    //
    // keyring.setSS58Format(0);
    // console.log('Polkadot', pair.address);

    const mnemonic = 'xxxxx'
    const a1 = keyring.createFromUri(mnemonic);
    console.log(a1.address)



}

// try {
//   main();
// } catch (error) {
//   console.error(error);
// }

let timer = null
let i = 1

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wsurl').value = defaultData.defaultWs
  document.getElementById('mnemonic').value = defaultData.defaultMnemonic
  document.getElementById('name').value = defaultData.defaultName

  const eyeNo = document.getElementById('eye-no')
  const eye = document.getElementById('eye')

  eyeNo.onclick = function () {
    eyeNo.style.display = 'none'
    eye.style.display = 'block'
    document.getElementById('mnemonic').type = 'password'
  }
  eye.onclick = function () {
    eyeNo.style.display = 'block'
    eye.style.display = 'none'
    document.getElementById('mnemonic').type = 'text'
  }

  const run = document.getElementById('run')
  run.onclick = function (e) {
    e.preventDefault()
    const ws = document.getElementById('wsurl').value.trim()
    const mnemonic = document.getElementById('mnemonic').value.trim()
    const name = document.getElementById('name').value.trim()

    if (!ws || !mnemonic || !name) {
      alert('Please enter the params')
      return
    }
    runing = !runing

    if (runing) {
      document.getElementById('wsurl').disabled = true
      document.getElementById('mnemonic').disabled = true
      document.getElementById('name').disabled = true
      outputList = []
      document.getElementById('output-list').innerHTML = '<li>--</li>'
      this.innerText = 'Running.'
      this.classList.add('active')
      i++
      timer = setInterval(() => {
        this.innerText = 'Running' + '.'.repeat(i % 3 + 1)
        i++
      }, 1000)
      main(ws, mnemonic, name)
    } else {
      document.getElementById('wsurl').disabled = false
      document.getElementById('mnemonic').disabled = false
      document.getElementById('name').disabled = false
      timer && clearInterval(timer)
      i = 1
      this.innerText = 'Run'
      this.classList.remove('active')
      globalApi && globalApi.disconnect()
    }
  }
})


// generatePolkadotKeyPair();

