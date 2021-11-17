import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useRef, useEffect } from 'preact/hooks';
import { StoreContext } from 'services/StoreContext';
import { sendMessage } from 'services/Messaging';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import { createChart } from 'lightweight-charts';

const WalletChart: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);

  const [walletData, setWalletData] = useState<any>([]);
  const [currency, setCurrency] = useState<any>('');

  const myRef = useRef<HTMLHeadingElement | string>('');

  let chart;

  let chartData;

  useEffect(() => {
    if (walletData.length === 0 || store.getSettingCurrency()['alias'] !== currency) {
      sendMessage(
        JsonRpcMethod.WalletChart,
        { ledger: store.ledger, currency: store.getSettingCurrency()['alias'] },
        function (response) {
          if (response.length > 0) {
            setWalletData(response);
            setCurrency(store.getSettingCurrency()['alias']);
          }
        }
      );
    }

    chart = createChart(myRef.current, { width: 400, height: 135 });

    chart.applyOptions({
      grid: {
        vertLines: {
          color: 'rgba(185, 193, 217, 0.3)',
          style: 0,
          visible: true,
        },
        horzLines: {
          color: 'rgba(185, 193, 217, 0.3)',
          style: 0,
          visible: true,
        },
      },
      lastValueVisible: false,
      //   crosshair: {
      //     vertLine: {
      //         color: 'rgba(255, 0, 0, 0.5)',
      //         width: 0.5,
      //         style: 1,
      //         visible: true,
      //         labelVisible: false,
      //     },
      //     horzLine: {
      //         color: 'rgba(0, 255, 0, 0.5)',
      //         width: 0.5,
      //         style: 0,
      //         visible: true,
      //         labelVisible: true,
      //     },
      //     mode: 1,
      // },
      localization: {
        priceFormatter: (price) => parseFloat(price).toFixed(3),
      },
      layout: {
        backgroundColor: 'transparent',
        lineColor: '#FFFFFF',
        textColor: '#B9C1D9',
        fontSize: 9,
        fontFamily: 'Lato',
      },
      timeScale: {
        rightOffset: 0,
        barSpacing: 15,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
      },
      priceScale: {
        position: 'left',
        // mode: 1,
        autoScale: false,
        // invertScale: true,
        alignLabels: true,
        borderVisible: false,
        borderColor: '#555ffd',
        scaleMargins: {
          top: 0.3,
          bottom: 0.15,
        },
        crosshair: {
          vertLine: {
            color: '#ff0000', //red
            width: 0.5,
            style: 1,
            visible: true,
            labelVisible: false,
          },
          horzLine: {
            color: '#00ff00',
            width: 0.5,
            style: 1,
            visible: true,
            labelVisible: true,
          },
          mode: 1,
        },
      },
    });
    chartData = chart.addAreaSeries({
      topColor: 'rgba(68, 11, 88, 0.0001)',
      bottomColor: 'rgba(254, 240, 238, 0.5)',
      lineColor: '#F4ECC1',
      lineWidth: 2,
      crosshairMarkerBorderColor: 'rgb(255, 255, 255, 1)',
      crosshairMarkerBackgroundColor: 'rgb(34, 150, 243, 1)',
      upColor: '#0B6623',
      downColor: '#FF6347',
      borderVisible: false,
      wickVisible: true,
      borderColor: '#000000',
      wickColor: '#000000',
      borderUpColor: '#4682B4',
      borderDownColor: '#A52A2A',
      wickUpColor: '#4682B4',
      wickDownColor: '#A52A2A',
      crosshairMarkerVisible: false,
      crosshairMarkerRadius: 3,
      lastValueVisible: false,
      grid: {
        vertLines: {
          color: 'rgba(255, 0, 0, 0.5)',
          style: 1,
          visible: true,
        },
        horzLines: {
          color: 'rgba(0, 255, 0, 1)',
          style: 1,
          visible: true,
        },
      },
    });

    if (walletData.length > 0) {
      chartData.setData(walletData);
    } else {
      // Wallet Data Not Found
      const now = new Date();
      chartData.setData([
        { time: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`, value: 0 },
      ]);
    }

    chart.timeScale().fitContent();

    //   chart.timeScale().setVisibleRange({
    //     from: (new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0))).getTime() / 1000,
    //     to: (new Date(Date.UTC(2018, 1, 1, 0, 0, 0, 0))).getTime() / 1000,
    // });

    return () => {
      if (chart) {
        chart.remove();
      }
    };
  }, [walletData, store.getSettingCurrency()]);

  return html` <div ref=${myRef} id="chart" class="divFlexTitleMese pr-4 mt-2 pl-2"> </div> `;
};

export default WalletChart;
