import { AffineShapeIcon } from '@affine/component/page-list';
import type { SubscriptionRecurring } from '@affine/graphql';
import { checkoutMutation, subscriptionQuery } from '@affine/graphql';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useMutation, useQuery } from '@affine/workspace/affine/gql';
import { Button } from '@toeverything/components/button';
import { Loading } from '@toeverything/components/loading';
import { nanoid } from 'nanoid';
import { type FC, Suspense, useCallback, useEffect, useMemo } from 'react';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../hooks/use-navigate-helper';
import * as styles from './subscription-redirect.css';
import { useSubscriptionSearch } from './use-subscription';

const CenterLoading = () => {
  return (
    <div className={styles.loadingContainer}>
      <Loading size={40} />
    </div>
  );
};

const SubscriptionExisting = () => {
  const t = useAFFiNEI18N();
  const { jumpToIndex } = useNavigateHelper();

  const onButtonClick = useCallback(() => {
    jumpToIndex(RouteLogic.REPLACE);
  }, [jumpToIndex]);

  return (
    <div className={styles.subscriptionLayout}>
      <div className={styles.subscriptionBox}>
        <AffineShapeIcon width={180} height={180} />
        <p className={styles.subscriptionTips}>
          {t['com.affine.payment.subscription.exist']()}
        </p>
        <Button
          data-testid="upgrade-workspace-button"
          onClick={onButtonClick}
          size="extraLarge"
          type="primary"
        >
          {t['com.affine.auth.open.affine']()}
        </Button>
      </div>
    </div>
  );
};

const SubscriptionRedirectInner: FC = () => {
  const subscriptionData = useSubscriptionSearch();
  const idempotencyKey = useMemo(() => nanoid(), []);
  const { data } = useQuery({
    query: subscriptionQuery,
  });
  const { trigger: checkoutSubscription } = useMutation({
    mutation: checkoutMutation,
  });

  useEffect(() => {
    if (!subscriptionData) {
      throw new Error('No subscription data found');
    }

    if (data.currentUser?.subscription) {
      return;
    }

    // This component will be render multiple times, use timeout to avoid multiple effect.
    const timeoutId = setTimeout(() => {
      const recurring = subscriptionData.recurring as SubscriptionRecurring;
      checkoutSubscription({ recurring, idempotencyKey }).then(
        ({ checkout }) => {
          window.open(checkout, '_self', 'norefferer');
        }
      );
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };

    // Just run this once, do not react to changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data.currentUser?.subscription) {
    return <SubscriptionExisting />;
  }

  return <CenterLoading />;
};

export const SubscriptionRedirect = () => {
  return (
    <Suspense fallback={<CenterLoading />}>
      <SubscriptionRedirectInner />
    </Suspense>
  );
};