import { useCallback, useEffect, useMemo, useState } from "react";

import { isRequestCanceled, vodsApi } from "../../shared/vodsApi";

export default function useCatalog({ isHomePage }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(Boolean);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [tags, setTags] = useState([]);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    if (!isHomePage) {
      setSearchInput("");
      setTags([]);
      setSearchKey((key) => key + 1);
    }
  }, [isHomePage]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setGames([]);
    setError(null);

    vodsApi.getCatalog({ signal: controller.signal })
      .then((catalog) => {
        if (!active) return;
        setGames(catalog);
        setLoading(false);
      })
      .catch((requestError) => {
        if (isRequestCanceled(requestError) || !active) return;
        setError("Unable to load the VOD catalog");
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const filteredGames = useMemo(() => {
    let results = games;

    if (searchInput) {
      results = results.filter((game) =>
        game.gameName.toString().toLowerCase().includes(searchInput.toLowerCase())
      );
    }

    if (tags.length > 0) {
      results = results.filter((game) =>
        tags.every((tag) => game.tags?.includes(tag))
      );
    }

    return results;
  }, [games, searchInput, tags]);

  const availableTags = useMemo(() => {
    const uniqueTags = new Set();

    games.forEach((game) => {
      game.tags?.forEach((tag) => {
        if (tag) uniqueTags.add(tag);
      });
    });

    return [...uniqueTags].sort((firstTag, secondTag) =>
      firstTag.localeCompare(secondTag)
    );
  }, [games]);

  const handleSearch = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const addTag = useCallback((tag) => {
    setTags((currentTags) => {
      if (currentTags.includes(tag) || currentTags.length >= 3) return currentTags;
      return [...currentTags, tag];
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchKey((key) => key + 1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setTags([]);
    setSearchKey((key) => key + 1);
  }, []);

  const removeTag = useCallback((tag) => {
    setTags((currentTags) => currentTags.filter((currentTag) => currentTag !== tag));
  }, []);

  return {
    addTag,
    availableTags,
    clearFilters,
    clearSearch,
    error,
    filteredGames,
    games,
    handleSearch,
    loading,
    removeTag,
    searchKey,
    tags,
  };
}
