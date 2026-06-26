import { useEffect, useMemo, useRef, useState } from 'react';
import { RecipeImage } from '../components/RecipeImage';
import { fmtFull, fmtRel, mdToHtml } from '../logic/recipes';
import { useAppStore, useRecipe } from '../store/AppStore';
import type { RecipeImage as RecipeImageType } from '../types';
import { toHostLabel } from '../utils/app';

const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
const LIGHTBOX_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes';

function setViewportContent(content: string) {
  document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.setAttribute('content', content);
}

export function RecipeDetail() {
  const { state, actions, tags } = useAppStore();
  const recipe = useRecipe(state.selectedRecipeId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightbox, setLightbox] = useState<RecipeImageType | null>(null);

  const suggestions = useMemo(() => {
    if (!recipe) return [];
    const query = state.tagInput.trim();
    return tags.filter((tag) => !recipe.tags.includes(tag) && (!query || tag.includes(query))).slice(0, 6);
  }, [recipe, state.tagInput, tags]);

  useEffect(() => {
    setViewportContent(lightbox ? LIGHTBOX_VIEWPORT : LOCKED_VIEWPORT);
    return () => {
      setViewportContent(LOCKED_VIEWPORT);
    };
  }, [lightbox]);

  if (!recipe) {
    return (
      <section className="screen">
        <header className="detail-top">
          <button className="icon-button" type="button" onClick={actions.back}>
            ‹
          </button>
        </header>
        <div className="empty-state">
          <h2>レシピが見つかりません</h2>
        </div>
      </section>
    );
  }

  const images = recipe.images.length ? recipe.images : [{ type: 'url' as const, src: '' }];

  return (
    <section className="screen detail-screen">
      <header className="detail-top">
        <button className="icon-button" type="button" onClick={actions.back} aria-label="戻る">
          ‹
        </button>
        {state.editing ? (
          <button className="pill-button pill-button--accent" type="button" onClick={actions.saveEdit}>
            完了
          </button>
        ) : (
          <button className="pill-button" type="button" onClick={actions.startEdit}>
            編集
          </button>
        )}
      </header>

      <div className="gallery" data-scroll>
        {images.map((image, index) => {
          const hasImage = Boolean(image.src);
          const isFirst = index === 0;
          const isLast = index === images.length - 1;

          return (
            <div
              className={`gallery-item${state.editing && hasImage ? ' gallery-item--editable' : ''}`}
              key={`${image.src || 'placeholder'}-${index}`}
            >
              <RecipeImage
                image={image}
                label={recipe.name}
                className="gallery-image"
                badgeLabel="取り込み画像"
                onClick={hasImage ? () => setLightbox(image) : undefined}
              />
              {state.editing && hasImage && (
                <>
                  <button
                    className="image-delete-button"
                    type="button"
                    onClick={() => void actions.removeImage(recipe.id, index)}
                    aria-label="写真を削除"
                  >
                    ×
                  </button>
                  <div className="image-order-controls" aria-label="写真の並べ替え">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => void actions.moveImage(recipe.id, index, 'prev')}
                      aria-label="写真を左へ移動"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => void actions.moveImage(recipe.id, index, 'next')}
                      aria-label="写真を右へ移動"
                    >
                      ▶
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {state.editing && (
          <>
            <button className="add-photo" type="button" onClick={() => fileInputRef.current?.click()}>
              <span>＋</span>
              写真を追加
            </button>
            <button className="add-photo add-photo--clipboard" type="button" onClick={() => void actions.pasteImageFromClipboard(recipe.id)}>
              <span>📋</span>
              クリップボードから貼り付け
            </button>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void actions.addLocalImage(recipe.id, file);
          event.currentTarget.value = '';
        }}
      />

      <div className="detail-content">
        {state.editing && (
          <section className="inline-import">
            <div className="inline-import__title">URLから取り込む</div>
            <div className="inline-import__row">
              <input
                value={state.editPasteUrl}
                onChange={(event) => actions.setEditPasteUrl(event.target.value)}
                placeholder="URLを貼り付け"
              />
              <button
                className="primary-button primary-button--small"
                type="button"
                disabled={!state.editPasteUrl.trim() || state.editImportLoading}
                onClick={() => void actions.runEditImport(recipe.id)}
              >
                {state.editImportLoading ? '読込中' : '取込'}
              </button>
            </div>
          </section>
        )}

        <div className="tag-row tag-row--wrap">
          {recipe.tags.map((tag) => (
            <span className="tag-chip tag-chip--large" key={tag}>
              {tag}
              {state.editing && (
                <button type="button" onClick={() => void actions.removeTag(recipe.id, tag)} aria-label={`${tag}を削除`}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>

        {state.editing && (
          <div className="tag-editor">
            <label className="field-row">
              <span>#</span>
              <input
                value={state.tagInput}
                list="recipe-tags"
                onChange={(event) => actions.setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void actions.addTag(recipe.id, state.tagInput);
                  }
                }}
                placeholder="タグを追加"
              />
            </label>
            <datalist id="recipe-tags">
              {tags.map((tag) => (
                <option value={tag} key={tag} />
              ))}
            </datalist>
            <div className="tag-row tag-row--wrap">
              {suggestions.map((tag) => (
                <button className="chip chip--ghost" type="button" key={tag} onClick={() => void actions.addTag(recipe.id, tag)}>
                  ＋{tag}
                </button>
              ))}
              {state.tagInput.trim() && !recipe.tags.includes(state.tagInput.trim()) && (
                <button className="chip chip--ghost" type="button" onClick={() => void actions.addTag(recipe.id, state.tagInput)}>
                  ＋{state.tagInput.trim()}
                </button>
              )}
            </div>
          </div>
        )}

        {state.editing ? (
          <input
            className="title-input"
            value={recipe.name}
            onChange={(event) => void actions.patchRecipe(recipe.id, { name: event.target.value })}
            placeholder="レシピ名"
          />
        ) : (
          <h1 className="recipe-title">{recipe.name}</h1>
        )}

        <div className="rating-row" aria-label="評価">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              className={value <= recipe.rating ? 'is-filled' : ''}
              type="button"
              key={value}
              onClick={() => void actions.setRating(recipe.id, value)}
              aria-label={`${value}つ星`}
            >
              ★
            </button>
          ))}
        </div>

        {state.editing ? (
          <label className="field-row">
            <span>🔗</span>
            <input
              value={recipe.url}
              onChange={(event) => void actions.patchRecipe(recipe.id, { url: event.target.value })}
              placeholder="参考URL"
            />
          </label>
        ) : (
          recipe.url && (
            <a className="url-link" href={recipe.url} target="_blank" rel="noreferrer">
              {toHostLabel(recipe.url)}
            </a>
          )
        )}

        <p className="made-date">
          最終作成 {fmtFull(recipe.lastMade)}・{fmtRel(recipe.lastMade)}
        </p>

        <div className="action-row">
          <button className="primary-button" type="button" onClick={() => void actions.markMade(recipe.id)}>
            作った
          </button>
          <button className="secondary-button" type="button" onClick={() => actions.openAddSheet(recipe.id)}>
            リスト
          </button>
        </div>

        {state.editing ? (
          <textarea
            className="body-editor"
            value={recipe.body}
            onChange={(event) => void actions.patchRecipe(recipe.id, { body: event.target.value })}
            rows={14}
          />
        ) : (
          <div className="md body-preview" dangerouslySetInnerHTML={{ __html: mdToHtml(recipe.body) }} />
        )}

        {state.editing && (
          <button
            className="danger-button full-width delete-action"
            type="button"
            onClick={() => actions.requestDeleteRecipe(recipe.id)}
          >
            このレシピを削除
          </button>
        )}
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox__close" type="button" aria-label="閉じる" onClick={() => setLightbox(null)}>
            ×
          </button>
          <RecipeImage image={lightbox} label={recipe.name} className="lightbox__image" />
        </div>
      )}
    </section>
  );
}
