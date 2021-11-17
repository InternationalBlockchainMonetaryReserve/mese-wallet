import { useState, useEffect } from 'preact/hooks';
import { ImageAsset } from 'helpers/ImageAsset';
import Default from '../assets/shape.svg';

export function useImageAsset(assets, ledger) {
  const [assetImages, setAssetImages] = useState<any>([]);

  useEffect(() => {
    assets.forEach((item) => {
      const imageAsset = new ImageAsset();

      const id = item['asset-id'] ?? (item['index'] ?? (item['id'] ?? item['assetName']));

      const exists = assetImages.find((item) => {
        return item.id === id;
      });

      if (exists) {
        return;
      }

      imageAsset.get(id, ledger, (res) => {
        const obj = [
          {
            id: id,
            img: res,
          },
        ];
        setAssetImages([...assetImages, ...obj]);
      });
    }, []);
  });

  return assetImages;
}

export const imageAsset = (asset, assetImageHook) => {
  const id = asset['asset-id'] ?? (asset['index'] ?? (asset['id'] ?? asset['assetName']));

  const image = assetImageHook.find((item) => {
    return item.id === id;
  });

  if (image) {
    return image.img;
  } else {
    return Default;
  }
};
