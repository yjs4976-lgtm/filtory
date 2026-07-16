import { AlertTriangle, CheckCircle2, Globe2, Info, SearchCheck } from "lucide-react"
import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { AnalysisResultViewModel, ConvenienceQuestionStatus } from "@/lib/analysisResultMapper"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

type ResultInsightSectionProps = {
  viewModel: AnalysisResultViewModel
  hasDetailedAccess?: boolean
  onShowPlus?: () => void
  formattedResetDate?: string
}

const DETAIL_PAGE_SIZE = 3

function formatPageStatus(template: string, current: number, total: number) {
  return template.replace("{current}", String(current)).replace("{total}", String(total))
}

function InsightList({ items, emptyText, tone }: { items: string[]; emptyText: string; tone: string }) {
  if (items.length === 0) {
    return <p className={styles.resultEmptyText}>{emptyText}</p>
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={`${styles.listItem} ${tone}`}>
          <span className={`${styles.listDot} ${styles.fillPrimary}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function signalLabel(signal: { phrase: string; reason?: string }) {
  return signal.reason ? `${signal.phrase} · ${signal.reason}` : signal.phrase
}

function SignalSummaryList({
  title,
  items,
  emptyText,
}: {
  title: string
  items: { phrase: string; reason?: string }[]
  emptyText: string
}) {
  return (
    <div className={styles.resultSignalGroup}>
      <h3 className={styles.titleXs}>{title}</h3>
      <InsightList items={items.map(signalLabel)} emptyText={emptyText} tone={styles.bgMint} />
    </div>
  )
}

function PaginatedInsightList({
  id,
  items,
  emptyText,
  tone,
  labels,
}: {
  id: string
  items: string[]
  emptyText: string
  tone: string
  labels: { previousPage: string; nextPage: string; pageStatus: string }
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(items.length / DETAIL_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visibleItems = useMemo(
    () => items.slice(safePage * DETAIL_PAGE_SIZE, safePage * DETAIL_PAGE_SIZE + DETAIL_PAGE_SIZE),
    [items, safePage]
  )

  if (items.length <= DETAIL_PAGE_SIZE) {
    return <InsightList items={items} emptyText={emptyText} tone={tone} />
  }

  return (
    <div className={styles.stackSm}>
      <InsightList items={visibleItems} emptyText={emptyText} tone={tone} />
      <div className={styles.resultPager} aria-label={id}>
        <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>
          {labels.previousPage}
        </button>
        <span>{formatPageStatus(labels.pageStatus, safePage + 1, totalPages)}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={safePage >= totalPages - 1}>
          {labels.nextPage}
        </button>
      </div>
    </div>
  )
}

function DetailPagePanel({
  pages,
  labels,
}: {
  pages: { title: string; content: ReactNode }[]
  labels: { previousPage: string; nextPage: string; pageStatus: string }
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, pages.length)
  const safePage = Math.min(page, totalPages - 1)
  const currentPage = pages[safePage]

  return (
    <div className={styles.resultDetailPager}>
      <div className={styles.resultDetailPagerHeader}>
        <strong>{currentPage.title}</strong>
        <span>{formatPageStatus(labels.pageStatus, safePage + 1, totalPages)}</span>
      </div>
      <div className={styles.resultDetailPageBody}>{currentPage.content}</div>
      <div className={styles.resultPager} aria-label={currentPage.title}>
        <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>
          {labels.previousPage}
        </button>
        <span>{formatPageStatus(labels.pageStatus, safePage + 1, totalPages)}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={safePage >= totalPages - 1}>
          {labels.nextPage}
        </button>
      </div>
    </div>
  )
}

function ResultAccordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className={styles.resultAccordion} open={defaultOpen}>
      <summary className={styles.resultAccordionSummary}>
        <span className={styles.row}>
          {icon}
          <strong>{title}</strong>
        </span>
      </summary>
      <div className={styles.resultAccordionBody}>{children}</div>
    </details>
  )
}

export function ResultInsightSection({ viewModel, hasDetailedAccess = true, onShowPlus, formattedResetDate }: ResultInsightSectionProps) {
  const { t } = useLanguage()
  const referenceSignals = Array.from(new Set([...viewModel.repetition.referenceWarnings, ...viewModel.signals.warningSignals]))
  const label = t.result.insights
  const pagerLabels = {
    previousPage: label.previousPage,
    nextPage: label.nextPage,
    pageStatus: label.pageStatus,
  }
  const unresolvedConvenienceChecks = viewModel.globalAccessibility.checks.filter((check) => check.status !== "confirmed")
  const unresolvedConvenienceTitle = label.unconfirmedInformationCount.replace("{count}", String(unresolvedConvenienceChecks.length))
  const cautionSignals = [
    ...viewModel.signals.promoSignals,
    ...viewModel.signals.repetitionSignals,
    ...viewModel.signals.exaggerationSignals,
  ]
  const mentionedAspectItems = [
    viewModel.signals.mentionedAspects.costMentioned ? label.costMentioned : "",
    viewModel.signals.mentionedAspects.waitingMentioned ? label.waitingMentioned : "",
    viewModel.signals.mentionedAspects.treatmentProcessMentioned ? label.treatmentProcessMentioned : "",
    viewModel.signals.mentionedAspects.aftercareMentioned ? label.aftercareMentioned : "",
  ].filter(Boolean)
  const detailedAnalysisPages = [
    {
      title: label.coreInsight,
      content: (
        <>
          <div className={styles.resultBadgePanel}>
            <span className={`${styles.resultStatusBadge} ${viewModel.ad.key === "high" ? styles.resultBadgeHigh : styles.resultBadgeSoft}`}>
              {label.adSuspicion} {viewModel.ad.label}
            </span>
            <p className={styles.mutedText}>{viewModel.ad.description}</p>
          </div>
          <p className={styles.resultEmptyText}>{viewModel.reviewBurst.description}</p>
        </>
      ),
    },
    {
      title: label.structuredSignals,
      content: (
        <div className={styles.stackSm}>
          <SignalSummaryList
            title={label.specificitySignals}
            items={viewModel.signals.specificitySignals}
            emptyText={label.noSpecificitySignals}
          />
          <SignalSummaryList
            title={label.cautionSignals}
            items={cautionSignals}
            emptyText={label.noCautionSignals}
          />
          <div className={styles.resultMentionedAspectList}>
            {mentionedAspectItems.length > 0 ? (
              mentionedAspectItems.map((item) => <span key={item}>{item}</span>)
            ) : (
              <p className={styles.resultEmptyText}>{label.noMentionedAspects}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: label.repetitive,
      content: (
        <PaginatedInsightList
          id={label.repetitive}
          items={viewModel.repetition.repetitivePhrases}
          emptyText={label.noRepetition}
          tone={styles.bgPeach}
          labels={pagerLabels}
        />
      ),
    },
    {
      title: label.suspicious,
      content: (
        <PaginatedInsightList
          id={label.suspicious}
          items={viewModel.repetition.suspiciousPhrases}
          emptyText={label.noSuspicious}
          tone={styles.bgPink}
          labels={pagerLabels}
        />
      ),
    },
    {
      title: label.reference,
      content: (
        <PaginatedInsightList
          id={label.reference}
          items={referenceSignals}
          emptyText={label.noReference}
          tone={styles.bgMint}
          labels={pagerLabels}
        />
      ),
    },
  ]

  return (
    <section className={styles.resultAccordionList}>
      <ResultAccordion
        title={label.detailAnalysis}
        icon={<AlertTriangle className={`${styles.iconSm} ${styles.pinkText}`} />}
        defaultOpen
      >
        {hasDetailedAccess ? <DetailPagePanel pages={detailedAnalysisPages} labels={pagerLabels} /> : <div className={styles.lockedDetailedAnalysis}>
          <h3>상세 광고 의심 근거</h3>
          <p>어떤 표현과 리뷰 패턴이 광고 가능성을 높였는지 확인할 수 있어요.</p>
          <strong>이번 달 무료 상세 분석을 모두 사용했어요.</strong>
          <small>{formattedResetDate}부터 다시 확인할 수 있습니다.</small>
          <small>Plus에서는 지금 바로 상세 근거를 확인할 수 있어요.</small>
          <button type="button" className={styles.primaryButton} onClick={onShowPlus}>Plus에서 확인하기</button>
        </div>}
      </ResultAccordion>

      <ResultAccordion
        title={label.globalAccessibilityDetail}
        icon={<Globe2 className={`${styles.iconSm} ${styles.iconPrimary}`} />}
      >
        <div className={styles.resultConvenienceSummary}>
          <strong>{viewModel.globalAccessibility.label}</strong>
          <span>{viewModel.globalAccessibility.description}</span>
        </div>
        <div className={styles.resultConvenienceQuestions}>
          {viewModel.globalAccessibility.questions.map((question) => (
            <div
              key={question.key}
              className={`${styles.resultConvenienceQuestion} ${convenienceQuestionClass(question.status)}`}
            >
              {question.status === "confirmed" ? (
                <CheckCircle2 className={`${styles.iconXs} ${styles.mintText}`} />
              ) : (
                <Info className={`${styles.iconXs} ${styles.iconPrimary}`} />
              )}
              <div>
                <span>{question.label}</span>
                <p>{question.description}</p>
              </div>
              <strong>{question.statusLabel}</strong>
            </div>
          ))}
        </div>
        {unresolvedConvenienceChecks.length > 0 && (
          <details className={styles.resultInlineDisclosure}>
            <summary>{unresolvedConvenienceTitle}</summary>
            <div className={styles.resultUnresolvedQuestionList}>
              {unresolvedConvenienceChecks.map((check) => (
                <div key={check.key} className={styles.resultUnresolvedQuestionItem}>
                  <strong>{check.label}</strong>
                  <span>
                    {check.status === "notConfirmed" ? label.needsChecking : label.notEnoughInformation}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </ResultAccordion>

      <ResultAccordion
        title={label.informationChecklist}
        icon={<SearchCheck className={`${styles.iconSm} ${styles.mintText}`} />}
      >
        <p className={styles.summaryText}>
          {label.informationPrefix} {viewModel.information.checkedCount} / {viewModel.information.totalCount}
        </p>
        <p className={styles.mutedText}>{viewModel.information.description}</p>
        <div className={styles.resultCheckGrid}>
          {viewModel.information.checks.map((check) => (
            <div key={check.key} className={styles.resultCheckItem}>
              {check.checked ? (
                <CheckCircle2 className={`${styles.iconXs} ${styles.mintText}`} />
              ) : (
                <Info className={`${styles.iconXs} ${styles.iconPrimary}`} />
              )}
              <span>{check.label}</span>
              <strong>{check.checked ? label.confirmed : label.unconfirmed}</strong>
            </div>
          ))}
        </div>
        {viewModel.information.checkItems.length > 0 && (
          <div className={styles.stackSm}>
            <h3 className={styles.titleXs}>{label.checkItems}</h3>
            <PaginatedInsightList
              id={label.checkItems}
              items={viewModel.information.checkItems}
              emptyText={label.noCheckItems}
              tone={styles.bgMint}
              labels={pagerLabels}
            />
          </div>
        )}
      </ResultAccordion>
    </section>
  )
}

function convenienceQuestionClass(status: ConvenienceQuestionStatus) {
  if (status === "confirmed") return styles.resultConvenienceQuestionConfirmed
  if (status === "partial") return styles.resultConvenienceQuestionPartial
  if (status === "needsCheck") return styles.resultConvenienceQuestionNeedsCheck
  return styles.resultConvenienceQuestionUnknown
}
