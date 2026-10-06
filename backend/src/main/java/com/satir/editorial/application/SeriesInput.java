package com.satir.editorial.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record SeriesInput(
    @NotBlank @Size(max=160) String title,
    @NotNull @Size(max=100) @Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") String slug,
    @NotNull @Size(max=1000) String summary,
    @NotNull Boolean ongoing,
    @NotNull @Valid ArticleInput.Cover cover,
    @NotNull @Valid Presentation presentation,
    @NotNull @Valid ArticleInput.Seo seo,
    @NotNull @Size(max=200) List<@NotNull UUID> chapterIds,
    @NotNull @Size(max=200) List<@NotNull @Valid Version> articleVersions) {
    public record Presentation(@NotNull @Pattern(regexp="left|center") String heading,
                               @NotNull @Pattern(regexp="cards|rows") String chapterStyle) {}
    public record Version(@NotNull UUID id,@PositiveOrZero long version) {}
}
