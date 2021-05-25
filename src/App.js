import React, { PureComponent } from "react"
import Blindnet from 'blindnet-sdk-js'
import { saveAs } from 'file-saver'

const FORM_INITIALIZED = 'FORM_INITIALIZED'
const USER_CONNECTED = 'USER_CONNECTED'
const FILE_SELECTED = 'FILE_SELECTED'
const FILE_ENCRYPTED = 'FILE_ENCRYPTED'
const ENCRYPTED_FILE_SELECTED = 'ENCRYPTED_FILE_SELECTED'
const FILE_DECRYPTED = 'FILE_DECRYPTED'

export default class App extends PureComponent {

  backendHost = 'http://localhost:9000'
  blindnetEndpoint = 'https://blindnet-api-xtevwj4sdq-ew.a.run.app'
  userId = `ui-test-${Math.random().toString(5).substring(2)}`

  constructor(props) {
    super(props)
    this.state = { formState: FORM_INITIALIZED, secret: '' }
  }

  updateSecret = (e) => this.setState({ ...this.state, secret: e.target.value })

  connect = async () => {
    const { secret } = this.state

    const token = await fetch(`${this.backendHost}/token/${this.userId}`).then(resp => resp.text())

    const blindnet = Blindnet.init(token, this.blindnetEndpoint)

    const { blindnetPassword } = await Blindnet.deriveSecrets(secret)
    await blindnet.connect(blindnetPassword)

    this.setState({ ...this.state, formState: USER_CONNECTED, blindnet })
  }

  selectFileToEncrypt = (e) => this.setState({
    ...this.state,
    formState: FILE_SELECTED,
    fileToEncrypt: e.target.files[0]
  })

  selectFileToDecrypt = (e) => this.setState({
    ...this.state,
    formState: ENCRYPTED_FILE_SELECTED,
    fileToDecrypt: e.target.files[0]
  })

  encryptFile = async () => {
    const { fileToEncrypt } = this.state

    const fileBytes = await fileToEncrypt.arrayBuffer()
    const fileMetadata = { name: fileToEncrypt.name }

    const token = await fetch(`${this.backendHost}/tempToken/${this.userId}`).then(resp => resp.text())

    const blindnet = Blindnet.init(token, this.blindnetEndpoint)

    const { dataId, encryptedData } = await blindnet.encrypt(fileBytes, fileMetadata)

    saveAs(new Blob([encryptedData]), `${fileToEncrypt.name}-encrypted`)

    this.setState({ ...this.state, formState: FILE_ENCRYPTED, fileId: dataId })
  }

  decryptFile = async () => {
    const { fileId, fileToDecrypt, blindnet } = this.state

    const encryptedFileBytes = await fileToDecrypt.arrayBuffer()

    const { data, metadata: metadataBytes } = await blindnet.decrypt(fileId, encryptedFileBytes)

    const metadata = JSON.parse(new TextDecoder().decode(metadataBytes))

    saveAs(new Blob([data]), metadata.name)

    this.setState({ ...this.state, file: undefined, formState: FILE_DECRYPTED, fileId })
  }

  render() {
    const { formState, fileToEncrypt, fileToDecrypt } = this.state

    return (
      <div className='wrapper'>

        <div style={{ marginTop: '25px' }} className={formState == FORM_INITIALIZED ? 'focused' : ''}>
          {formState == FORM_INITIALIZED && <div style={{ margin: '10px' }}>Type a password and click the 'connect' button to generate a user.</div>}

          <div style={{ margin: '10px' }}>
            <input type='password' placeholder='secret' className='pass-field' onChange={this.updateSecret} disabled={formState != FORM_INITIALIZED} />
            <button id='connect-btn' onClick={() => { document.getElementById('connect-btn').disabled = true; this.connect() }} disabled={formState != FORM_INITIALIZED} style={{ marginLeft: '10px' }}>connect</button>
          </div>
        </div>

        <div style={{ marginTop: '25px' }} className={[USER_CONNECTED, FILE_SELECTED].includes(formState) ? 'focused' : ''}>
          {formState == USER_CONNECTED && <div style={{ margin: '10px' }}>The user has connected to blindnet. Now select a file to encrypt.</div>}
          {formState == FILE_SELECTED && <div style={{ margin: '10px' }}>Click the 'encrypt' button to encrypt and download the file for the connected user.</div>}

          <div style={{ margin: '10px' }}>
            <input type='file' onChange={this.selectFileToEncrypt} disabled={![USER_CONNECTED, FILE_SELECTED].includes(formState)} />
          </div>

          <div style={{ margin: '10px' }}>
            <button onClick={this.encryptFile} disabled={formState != FILE_SELECTED}>encrypt file</button>
          </div>
        </div>

        <div style={{ marginTop: '25px' }} className={[FILE_ENCRYPTED, ENCRYPTED_FILE_SELECTED].includes(formState) ? 'focused' : ''}>
          {formState == FILE_ENCRYPTED && <div style={{ margin: '10px' }}>Good, now select the encrypted file (original file name with '-encrypted').</div>}
          {formState == ENCRYPTED_FILE_SELECTED && <div style={{ margin: '10px' }}>Click the 'decrypt' button and download the original file.</div>}

          <div style={{ margin: '10px', marginTop: '25px' }}>
            <input type='file' onChange={this.selectFileToDecrypt} disabled={![FILE_ENCRYPTED, ENCRYPTED_FILE_SELECTED].includes(formState)} />
          </div>

          <div style={{ margin: '10px' }}>
            <button onClick={this.decryptFile} disabled={formState != ENCRYPTED_FILE_SELECTED}>decrypt file</button>
          </div>
        </div>

        <div style={{ marginTop: '25px' }}>
          {formState == FILE_DECRYPTED && <div style={{ margin: '10px' }}>That's it, try opening the decrypted file.</div>}
        </div>

      </div>
    )
  }
}