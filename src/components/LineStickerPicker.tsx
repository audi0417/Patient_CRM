/**
 * LINE 貼圖選擇器元件
 * 提供 LINE 官方免費貼圖選擇介面
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smile } from 'lucide-react';

// LINE 官方免費貼圖包
// 參考：https://developers.line.biz/en/docs/messaging-api/sticker-list/
const FREE_STICKER_PACKAGES = [
  {
    packageId: '11537',
    name: 'Brown & Cony',
    stickers: [
      { id: '52002734', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002734/android/sticker.png' },
      { id: '52002735', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002735/android/sticker.png' },
      { id: '52002736', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002736/android/sticker.png' },
      { id: '52002737', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002737/android/sticker.png' },
      { id: '52002738', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002738/android/sticker.png' },
      { id: '52002739', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002739/android/sticker.png' },
      { id: '52002740', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002740/android/sticker.png' },
      { id: '52002741', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52002741/android/sticker.png' },
    ]
  },
  {
    packageId: '11538',
    name: 'Moon',
    stickers: [
      { id: '51626494', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626494/android/sticker.png' },
      { id: '51626495', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626495/android/sticker.png' },
      { id: '51626496', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626496/android/sticker.png' },
      { id: '51626497', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626497/android/sticker.png' },
      { id: '51626498', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626498/android/sticker.png' },
      { id: '51626499', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626499/android/sticker.png' },
      { id: '51626500', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626500/android/sticker.png' },
      { id: '51626501', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/51626501/android/sticker.png' },
    ]
  },
  {
    packageId: '11539',
    name: 'Cony',
    stickers: [
      { id: '52114110', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114110/android/sticker.png' },
      { id: '52114111', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114111/android/sticker.png' },
      { id: '52114112', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114112/android/sticker.png' },
      { id: '52114113', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114113/android/sticker.png' },
      { id: '52114114', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114114/android/sticker.png' },
      { id: '52114115', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114115/android/sticker.png' },
      { id: '52114116', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114116/android/sticker.png' },
      { id: '52114117', preview: 'https://stickershop.line-scdn.net/stickershop/v1/sticker/52114117/android/sticker.png' },
    ]
  },
];

interface LineStickerPickerProps {
  onSelectSticker: (packageId: string, stickerId: string) => void;
  disabled?: boolean;
}

export const LineStickerPicker = ({ onSelectSticker, disabled }: LineStickerPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelectSticker = (packageId: string, stickerId: string) => {
    onSelectSticker(packageId, stickerId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className="shrink-0"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue={FREE_STICKER_PACKAGES[0].packageId} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b">
            {FREE_STICKER_PACKAGES.map((pack) => (
              <TabsTrigger key={pack.packageId} value={pack.packageId} className="text-xs">
                {pack.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {FREE_STICKER_PACKAGES.map((pack) => (
            <TabsContent key={pack.packageId} value={pack.packageId} className="m-0">
              <ScrollArea className="h-64">
                <div className="grid grid-cols-4 gap-2 p-4">
                  {pack.stickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleSelectSticker(pack.packageId, sticker.id)}
                      className="aspect-square rounded-lg hover:bg-accent transition-colors p-1"
                    >
                      <img
                        src={sticker.preview}
                        alt={`Sticker ${sticker.id}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default LineStickerPicker;
