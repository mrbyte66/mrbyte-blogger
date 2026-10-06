package com.satir.editorial.application;

import com.satir.editorial.domain.ContentDocument;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ArticleInput(@NotNull @Size(max=200)String title,@Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") @Size(max=100)String slug,
    @NotNull @Size(max=160)String eyebrow,@com.fasterxml.jackson.annotation.JsonProperty("abstract") @NotNull @Size(max=4000)String abstractText,LocalDate displayDate,
    @NotNull @Size(max=10)List<UUID> categoryIds,@NotNull ContentDocument document,@NotNull @Valid Presentation presentation,
    @NotNull @Valid Seo seo,@NotNull @Valid Cover cover,@Valid SeriesPlacement seriesPlacement,@NotNull @Size(max=2) List<@NotNull @Valid SeriesVersion> seriesVersions,String visibility) {
    public record Presentation(@NotNull @Pattern(regexp="comfortable|wide")String width,@NotNull @Pattern(regexp="left|center")String heading,@NotNull Boolean showMeta){}
    public record Seo(@Size(max=200)String title,@Size(max=400)String description,@NotNull Boolean indexable){}
    public record Cover(@NotNull @Pattern(regexp="auto|manual|none")String mode,UUID assetId){}
    public record SeriesPlacement(@NotNull UUID seriesId){}
    public record SeriesVersion(@NotNull UUID id,@PositiveOrZero long version){}
}
