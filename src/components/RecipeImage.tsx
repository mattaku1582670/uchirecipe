import { useEffect, useState } from 'react';
import { getLocalImage } from '../db';
import type { RecipeImage as RecipeImageType } from '../types';
import { colorForString, initialOf } from '../utils/app';

type Props = {
  image?: RecipeImageType;
  label: string;
  className?: string;
  badgeLabel?: string;
  onClick?: () => void;
};

export function RecipeImage({ image, label, className = '', badgeLabel = '取り込み画像', onClick }: Props) {
  const [failed, setFailed] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const color = colorForString(image?.src || label);
  const clickable = onClick ? ' recipe-image--clickable' : '';

  useEffect(() => {
    setFailed(false);
  }, [image?.src, image?.type]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadLocal() {
      if (image?.type !== 'local' || !image.src) {
        setLocalUrl(null);
        return;
      }

      const record = await getLocalImage(image.src);
      if (!record || cancelled) return;

      objectUrl = URL.createObjectURL(record.blob);
      setLocalUrl(objectUrl);
    }

    void loadLocal();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image?.src, image?.type]);

  if (!image || image.broken || failed || !image.src) {
    return (
      <div className={`recipe-image recipe-image--placeholder ${className}${clickable}`} style={{ background: color }} onClick={onClick}>
        <span>{initialOf(label)}</span>
        {(image?.broken || failed) && <small>画像を読み込めません</small>}
      </div>
    );
  }

  const src = image.type === 'local' ? localUrl : image.src;
  if (!src) {
    return (
      <div className={`recipe-image recipe-image--placeholder ${className}${clickable}`} style={{ background: color }} onClick={onClick}>
        <span>{initialOf(label)}</span>
      </div>
    );
  }

  return (
    <div className={`recipe-image ${className}${clickable}`} onClick={onClick}>
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      {image.type === 'url' && <span className="image-badge">{badgeLabel}</span>}
    </div>
  );
}
