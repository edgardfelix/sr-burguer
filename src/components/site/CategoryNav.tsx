'use client';

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { MenuSection } from '@/lib/catalog';
import { c, ease, layout, mq } from '@/styles/tokens';

/** Barra fixa de categorias com destaque da seção visível (scroll-spy). */
export function CategoryNav({ sections }: { sections: MenuSection[] }) {
  const [active, setActive] = useState(sections[0]?.category.slug ?? '');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const offset = 140;
      let current = sections[0]?.category.slug ?? '';
      for (const s of sections) {
        const el = document.getElementById(s.category.slug);
        if (el && el.getBoundingClientRect().top - offset <= 0) current = s.category.slug;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLAnchorElement>(`[data-slug="${active}"]`);
    if (!list || !link) return;
    const target = link.offsetLeft - (list.clientWidth - link.clientWidth) / 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [active]);

  if (sections.length === 0) return null;

  return (
    <Nav aria-label="Categorias do cardápio">
      <List ref={listRef} role="list">
        {sections.map((s) => (
          <li key={s.category.id}>
            <a href={`#${s.category.slug}`} data-slug={s.category.slug} aria-current={active === s.category.slug ? 'true' : undefined}>
              {s.category.name}
              <span>{s.products.length}</span>
            </a>
          </li>
        ))}
      </List>
    </Nav>
  );
}

const Nav = styled.nav`
  position: sticky;
  top: calc(${layout.header} + env(safe-area-inset-top, 0px));
  z-index: 30;
  background: ${c.paper};
  border-bottom: 1px solid ${c.line};
`;

const List = styled.ul`
  display: flex;
  gap: 4px;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};
  overflow-x: auto;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  scroll-padding: 0 ${layout.gutter};

  &::-webkit-scrollbar {
    display: none;
  }

  li {
    flex: none;
  }

  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: ${layout.categoryNav};
    padding: 0 12px;
    font-size: 0.9375rem;
    font-weight: 600;
    color: ${c.muted};
    text-decoration: none;
    white-space: nowrap;
    transition: color 180ms ease;
  }

  a span {
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${c.muted};
    opacity: 0.8;
  }

  a::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: -1px;
    height: 2px;
    background: ${c.ink};
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 240ms ${ease.out};
  }

  a[aria-current='true'] {
    color: ${c.ink};
  }
  a[aria-current='true']::after {
    transform: scaleX(1);
  }

  ${mq.hover} {
    a:hover {
      color: ${c.ink};
    }
  }
`;
