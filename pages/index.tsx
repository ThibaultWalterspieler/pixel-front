import {
  Button,
  Card,
  Modal,
  Progress,
  Spacer,
  Text,
  Tooltip,
} from '@nextui-org/react';
import { ethers } from 'ethers';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { SliderPicker } from 'react-color';
import tinyColor from 'tinycolor2';
import { Pixel } from '../interfaces/pixel.interface';
import styles from '../styles/Home.module.css';
import abi from '../utils/PixelPortal.json';

const Home: NextPage = () => {
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [pixelsCount, setPixelsCount] = useState<number>(0);
  const [allPixels, setAllPixels] = useState<Pixel[]>([]);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [color1, setColor1] = useState<string>();
  const [color2, setColor2] = useState<string>();
  const [isMining, setMining] = useState<boolean>(false);
  const [isMined, setIsMined] = useState<boolean>(false);

  const contractAddress = '0x6811D0FAc431884b7E56742A41d8E6C90054e77a';
  const contractABI = abi.abi;

  const randomizeColor = () => {
    const color1Hex = tinyColor.random().toHexString();
    const color2Hex = tinyColor.random().toHexString();
    const color1Analogous = tinyColor(color1Hex).analogous();
    const color2Analogous = tinyColor(color2Hex).analogous();

    const color1RandomIdx = Math.round(
      Math.random() * (color1Analogous.length - 1)
    );
    const color2RandomIdx = Math.round(
      Math.random() * (color2Analogous.length - 1)
    );

    setColor1(tinyColor(color1Analogous[color1RandomIdx]).toHex());
    setColor2(tinyColor(color2Analogous[color2RandomIdx]).toHex());
  };

  const getPixelsCount = async () => {
    const { ethereum } = window;

    if (ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const pixelPortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        let count = await pixelPortalContract.getTotalPixels();
        setPixelsCount(count.toNumber());
      } catch (error) {
        console.error(error);
      }
    }
  };

  const getAllPixels = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const pixelPortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        const pixels = await pixelPortalContract.getAllPixels();

        let wavesCleaned: any[] = [];
        pixels.forEach((pixel: any) => {
          console.log(pixel);
          wavesCleaned.push({
            address: pixel.pixeler,
            timestamp: new Date(pixel.timestamp * 1000),
            color1: pixel.color1,
            color2: pixel.color2,
          });
        });

        setAllPixels(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const addPixel = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const pixelPortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        let count = await pixelPortalContract.getTotalPixels();
        setPixelsCount(count.toNumber());

        const pixelTxn = await pixelPortalContract.pixelise(color1, color2, {
          gasLimit: 300000,
        });
        console.log('Mining...', pixelTxn.hash);
        setMining(true);
        await pixelTxn.wait();
        setMining(false);
        setIsMined(true);
        console.log('Mined -- ', pixelTxn.hash);

        count = await pixelPortalContract.getTotalPixels();
        setPixelsCount(count.toNumber());
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      setIsMined(false);
      setMining(false);
      console.log(error);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log('Make sure you have metamask!');
      } else {
        console.log('We have the ethereum object', ethereum);
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log('Found an authorized account:', account);
        setCurrentAccount(account);
      } else {
        console.log('No authorized account found');
      }
    } catch (err) {
      console.log(err);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask!');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('Connected', accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    getAllPixels();
    getPixelsCount();
    randomizeColor();

    let pixelPortalContract: ethers.Contract;
    const onNewPixel = (
      from: any,
      timestamp: number,
      color1: string,
      color2: string
    ) => {
      console.log('NewPixel', from, timestamp, color1, color2);
      setAllPixels((prevState) => {
        return [
          ...prevState,
          {
            address: from,
            timestamp: new Date(timestamp * 1000),
            color1,
            color2,
          },
        ];
      });
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      pixelPortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      pixelPortalContract.on('NewPixel', onNewPixel);
    }

    return () => {
      if (pixelPortalContract) {
        pixelPortalContract.off('NewPixel', onNewPixel);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Hello {currentAccount}</title>
        <meta name='description' content='Generated by create next app' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        {!currentAccount && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <h1 className={styles.title}>Pixels</h1>
            <p className={styles.description}>
              Add your own pixels to the blockchain among the others.
            </p>
            <Button
              shadow
              color='primary'
              auto
              onClick={() => setModalVisible(true)}
            >
              {currentAccount ? 'Add Pixel' : 'Connect Wallet'}
            </Button>
          </div>
        )}
        <Modal
          closeButton
          blur
          aria-labelledby='modal-title'
          open={isModalVisible}
          onClose={() => setModalVisible(false)}
        >
          {!currentAccount && (
            <>
              <Modal.Header>
                <Text
                  h1
                  size={30}
                  css={{
                    textGradient: `45deg, #${color1} -20%, #${color2} 50%`,
                  }}
                  weight='bold'
                >
                  Connect you wallet
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Text>
                  To add your pixel and see others, you need to connect your
                  wallet.
                </Text>
                <Spacer x={20} />
                <Button className='waveButton' onClick={connectWallet}>
                  Connect Wallet
                </Button>
              </Modal.Body>
            </>
          )}
          {currentAccount && !isMining && (
            <>
              <Modal.Header>
                <Text
                  h1
                  size={30}
                  css={{
                    textGradient: `45deg, #${color1} -20%, #${color2} 50%`,
                  }}
                  weight='bold'
                >
                  Add your pixel
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Text>
                  Select your gradient and add your beautiful pixel to the
                  blockchain.
                </Text>
                <Spacer x={2} />
                <Card bordered>
                  <h3>Preview:</h3>
                  <div
                    style={{
                      height: '40px',
                      width: '40px',
                      margin: '4px',
                      background: `linear-gradient(90deg,#${color1},#${color2})`,
                    }}
                  ></div>
                  <Spacer x={5} />
                  <h4>Color 1:</h4>
                  <SliderPicker
                    color={color1}
                    onChangeComplete={(selectedColor) =>
                      setColor1(selectedColor.hex.split('#')[1])
                    }
                  />
                  <h4>Color 2:</h4>
                  <SliderPicker
                    color={color2}
                    onChangeComplete={(selectedColor) =>
                      setColor2(selectedColor.hex.split('#')[1])
                    }
                  />
                  <Spacer x={5} />
                  <Button
                    auto
                    color='secondary'
                    onClick={() => {
                      randomizeColor();
                    }}
                  >
                    Randomize colors
                  </Button>
                </Card>

                <Button
                  style={{
                    background: `linear-gradient(90deg,#${color1},#${color2})`,
                  }}
                  onClick={addPixel}
                >
                  Add my pixel
                </Button>
                {/* <Link icon block color='warning' href='#'>
                  {currentAccount}
                </Link> */}
              </Modal.Body>
            </>
          )}
          {isMining && (
            <>
              <Modal.Header>
                <Text
                  h1
                  size={30}
                  css={{
                    textGradient: `45deg, #${color1} -20%, #${color2} 50%`,
                  }}
                  weight='bold'
                >
                  Mining your pixel...
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Progress
                  indeterminated
                  shadow
                  value={50}
                  color='success'
                  status='secondary'
                />
              </Modal.Body>
            </>
          )}
          {isMined && (
            <>
              <Modal.Header>
                <Text h1 size={30} color='success' weight='bold'>
                  Your pixel has been mined!
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Button onClick={() => setModalVisible(false)}>Close</Button>
              </Modal.Body>
            </>
          )}
        </Modal>

        <div className={styles.boxesContainer}>
          {allPixels.map((pixel, index) => {
            console.log(pixel);
            return (
              <Tooltip
                key={`tooltip-${pixel.address}-${index}-${pixel.timestamp}`}
                content={pixel.address}
                color='invert'
                contentColor='primary'
                shadow
                placement='bottomStart'
              >
                <div
                  className={`${pixel.address}`}
                  key={`box-${pixel.address}-${index}-${pixel.timestamp}`}
                  style={{
                    height: '40px',
                    width: '40px',
                    margin: '4px',
                    background: `linear-gradient(90deg,#${pixel.color1},#${pixel.color2})`,
                  }}
                ></div>
              </Tooltip>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Home;
