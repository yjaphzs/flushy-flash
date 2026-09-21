import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { List } from '@/components/common/list';
import { FloatingBackButton } from '@/components/layouts/floating-back-button';
import { Screen } from '@/components/layouts/screen';
import { useScreenTopClearance } from '@/components/layouts/tab-bar-metrics';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { PhotoViewerSlide } from '@/features/restrooms/components/photo-viewer-slide';
import { usePhotoViewerStore, useViewerIndex, useViewerPaths } from '@/stores/photo-viewer-store';

/**
 * Every photo of one restroom or review, full screen.
 *
 * ⚠️ **A route, not an overlay on the detail page.** The hero lives inside
 * `ReviewList`'s `ListHeaderComponent`, so a pager rendered in place would put
 * a horizontal gesture inside a virtualized vertical scroll — which is the
 * objection `restroom-hero.tsx` has always raised against a carousel and which
 * is still correct. Pushing a sibling route sidesteps it entirely.
 *
 * ⚠️ **`useBottomInset()`, not `useTabBarClearance()`** — and in fact neither is
 * needed here, because nothing sits at the bottom. A full-screen modal covers
 * the tab stack, so the floating pill is not on screen and reserving 88pt for
 * it would pad against nothing (`tab-bar-metrics.ts`).
 *
 * The ground is `--viewer-ground`, the one colour in `global.css` that does not
 * follow the scheme. See the token's own note for why a photo viewer is the
 * exception.
 */
export default function PhotosScreen() {
  const paths = useViewerPaths();
  const opening = useViewerIndex();
  const topClearance = useScreenTopClearance();

  /*
    The pager cannot render before it knows how wide a page is: `pagingEnabled`
    snaps to the SCROLL VIEW's width, and `initialScrollIndex` resolves against
    the item size. Rendering at a guessed width and correcting on layout lands
    the user between two photos on open.
  */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [page, setPage] = useState(opening);
  const [zoomed, setZoomed] = useState(false);

  /*
    Cleared on unmount rather than in `close()`. Clearing first would empty
    `paths` while the dismiss animation is still running, so the last frame of
    the transition is a blank screen.
  */
  useEffect(() => () => usePhotoViewerStore.getState().close(), []);

  return (
    <Screen topInset={false} className="flex-1 bg-viewer-ground">
      <View
        className="flex-1"
        testID="photos-pager"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize((s) => (s?.w === width && s?.h === height ? s : { w: width, h: height }));
        }}
      >
        {size ? (
          <List
            data={paths}
            horizontal
            pagingEnabled
            // The other half of the zoom/paging split — see the slide's
            // docblock. Gesture config alone is a race; this settles it.
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={opening}
            keyExtractor={(path) => path}
            estimatedItemSize={size.w}
            onMomentumScrollEnd={(e) => {
              setPage(Math.round(e.nativeEvent.contentOffset.x / size.w));
              // Belt and braces: a zoomed slide cannot be swiped away, because
              // zooming is what disables this scroll in the first place. This
              // is here so the invariant survives someone relaxing that.
              setZoomed(false);
            }}
            renderItem={({ item, index }) => (
              <PhotoViewerSlide
                path={item}
                width={size.w}
                height={size.h}
                isActive={index === page}
                zoomed={index === page ? zoomed : false}
                onZoomChange={setZoomed}
                onDismiss={() => router.back()}
              />
            )}
          />
        ) : null}
      </View>

      <FloatingBackButton onPress={() => router.back()} top={topClearance} testID="photos-back" />

      {/*
        The counter earns its place only when there is more than one — on a
        single photo "1 of 1" is a label for a fact the user can see.

        On the same opaque disc as the back button, for the same reason
        floating-back-button.tsx gives: a photograph is arbitrary content, so no
        text token has verifiable contrast over it. A known background does.
      */}
      {paths.length > 1 ? (
        <View className="absolute right-4 items-end" style={{ top: topClearance }}>
          <View className="h-12 justify-center rounded-full bg-background/95 px-4 shadow-md">
            <Text type="body-sm" weight="medium" accessibilityLabel={`Photo ${page + 1} of ${paths.length}`}>
              {page + 1} / {paths.length}
            </Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
